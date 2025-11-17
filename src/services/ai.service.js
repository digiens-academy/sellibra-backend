const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const logger = require('../utils/logger');
const config = require('../config/env');

// Configure axios retry for all requests
// axios-retry v4 CommonJS import - uses .default property
const axiosRetryModule = require('axios-retry');
const axiosRetry = axiosRetryModule.default || axiosRetryModule;

if (axiosRetry && typeof axiosRetry === 'function') {
  axiosRetry(axios, {
    retries: 3,
    retryDelay: axiosRetryModule.exponentialDelay, // Use exponentialDelay helper
    retryCondition: (error) => {
      // Retry on network errors or 5xx server errors
      return axiosRetryModule.isNetworkOrIdempotentRequestError(error) || 
             (error.response && error.response.status >= 500);
    },
    onRetry: (retryCount, error, requestConfig) => {
      logger.warn(`API request retry ${retryCount}/3: ${requestConfig.url}`);
    },
  });
}

class AIService {
  /**
   * Arka planı kaldır
   * Remove.bg API kullanarak görselin arka planını kaldırır
   * 
   * NOT: OpenAI'ın background removal API'si yoktur.
   * Bu işlem için Remove.bg, Clipdrop veya benzeri servisleri kullanmak gerekir.
   * 
   * @param {string} imagePath - İşlenecek görsel yolu
   * @returns {Promise<Buffer>} - Arka planı kaldırılmış görsel
   */
  async removeBackground(imagePath) {
    try {
      // Remove.bg API key kontrolü
      if (!process.env.REMOVE_BG_API_KEY) {
        logger.warn('Remove.bg API key bulunamadı, mock işlem yapılıyor');
        return await this.mockRemoveBackground(imagePath);
      }

      logger.info(`Arka plan kaldırma başlatıldı: ${imagePath}`);

      // Remove.bg API'ye istek gönder
      const formData = new FormData();
      formData.append('image_file', fs.createReadStream(imagePath));
      formData.append('size', 'auto');

      const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
        headers: {
          ...formData.getHeaders(),
          'X-Api-Key': process.env.REMOVE_BG_API_KEY,
        },
        responseType: 'arraybuffer',
        timeout: 30000, // 30 seconds timeout
      });

      logger.info('Arka plan başarıyla kaldırıldı');
      return Buffer.from(response.data, 'binary');

    } catch (error) {
      logger.error('Remove.bg API hatası:', error.response?.data || error.message);
      
      // API hatası durumunda mock işlem yap
      if (error.response?.status === 403 || error.response?.status === 402) {
        logger.warn('Remove.bg API limiti aşıldı veya geçersiz key, mock işlem yapılıyor');
        return await this.mockRemoveBackground(imagePath);
      }
      
      throw new Error('Arka plan kaldırma işlemi başarısız oldu');
    }
  }

  /**
   * Mock arka plan kaldırma (geliştirme/test için)
   * Gerçek API olmadığında basit bir işlem yapar
   */
  async mockRemoveBackground(imagePath) {
    try {
      logger.info('Mock arka plan kaldırma işlemi yapılıyor');
      
      // Görseli oku ve PNG'ye çevir (şeffaf arka plan için)
      const processedImage = await sharp(imagePath)
        .png()
        .toBuffer();

      return processedImage;
    } catch (error) {
      logger.error('Mock işlem hatası:', error);
      throw new Error('Görsel işleme başarısız oldu');
    }
  }

  /**
   * Text-to-Image (DALL-E 3 ile)
   * OpenAI DALL-E 3 kullanarak metin açıklamasından görsel oluşturur
   */
  async textToImage(prompt, options = {}) {
    try {
      // OpenAI API key kontrolü
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key bulunamadı');
      }

      logger.info(`Text-to-Image başlatıldı: ${prompt}`);

      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: options.model || 'dall-e-3',
          prompt: prompt,
          n: options.n || 1,
          size: options.size || '1024x1024',
          quality: options.quality || 'standard',
          style: options.style || 'vivid'
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000, // 60 seconds timeout for image generation
        }
      );

      logger.info('Görsel başarıyla oluşturuldu');
      return response.data.data[0];

    } catch (error) {
      logger.error('DALL-E API hatası:', error.response?.data || error.message);
      throw new Error('Görsel oluşturma başarısız oldu');
    }
  }

  /**
   * Image-to-Image (DALL-E 2 Edit ile)
   * Mevcut görseli düzenler
   * 
   * NOT: DALL-E Edit API RGBA formatı gerektirir (şeffaf kanal)
   */
  async imageToImage(imagePath, prompt, options = {}) {
    let convertedImagePath = null;

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key bulunamadı');
      }

      logger.info(`Image-to-Image başlatıldı: ${prompt}`);

      // Görseli RGBA formatına dönüştür (OpenAI API gereksinimi)
      const convertedImageBuffer = await sharp(imagePath)
        .ensureAlpha() // Şeffaf kanal ekle (RGBA)
        .png() // PNG formatına çevir
        .toBuffer();

      // Geçici dosya oluştur
      const tempDir = path.join(__dirname, '../../uploads/temp');
      const tempFileName = `converted-${Date.now()}.png`;
      convertedImagePath = path.join(tempDir, tempFileName);
      
      // Dönüştürülmüş görseli kaydet
      fs.writeFileSync(convertedImagePath, convertedImageBuffer);

      const formData = new FormData();
      formData.append('image', fs.createReadStream(convertedImagePath));
      formData.append('prompt', prompt);
      formData.append('n', options.n || 1);
      formData.append('size', options.size || '1024x1024');

      const response = await axios.post(
        'https://api.openai.com/v1/images/edits',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          timeout: 60000, // 60 seconds timeout
        }
      );

      // Geçici dosyayı sil
      if (convertedImagePath && fs.existsSync(convertedImagePath)) {
        fs.unlinkSync(convertedImagePath);
        logger.info(`Geçici dosya silindi: ${convertedImagePath}`);
      }

      logger.info('Görsel başarıyla düzenlendi');
      return response.data.data[0];

    } catch (error) {
      // Hata durumunda geçici dosyayı sil
      if (convertedImagePath && fs.existsSync(convertedImagePath)) {
        fs.unlinkSync(convertedImagePath);
        logger.info(`Geçici dosya silindi (hata): ${convertedImagePath}`);
      }

      logger.error('DALL-E Edit API hatası:', error.response?.data || error.message);
      throw new Error('Görsel düzenleme başarısız oldu');
    }
  }

  /**
   * Etsy için SEO-optimized ürün tagleri oluştur
   * OpenAI ChatGPT kullanarak Etsy için optimize edilmiş ürün tagleri üretir
   */
  async generateEtsyTags(productInfo) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key bulunamadı');
      }

      const { 
        productName, 
        productType = 'tişört', 
        keywords = [], 
        targetAudience,
        style,
        color,
        material,
        occasion,
        theme
      } = productInfo;

      logger.info(`Etsy tagleri oluşturuluyor: ${productName}`);

      // SEO odaklı prompt hazırla
      const systemPrompt = `Sen bir Etsy SEO uzmanısın. Görevin, Etsy'de arama sonuçlarında üst sıralarda çıkmak için maksimum etkili ürün tagleri oluşturmak.

Etsy tag kuralları:
- Maksimum 13 tag kullanabilirsin
- Her tag maksimum 20 karakter olmalı
- Küçük harf kullan (Etsy otomatik küçültür)
- Çok kelimeli taglar kullanabilirsin (örn: "vintage tişört")
- Tekil ve çoğul formları ayrı taglar olarak kullan
- Uzun kuyruklu (long-tail) anahtar kelimeler ekle
- Geniş ve dar anahtar kelimeleri dengele
- Türkçe karakterler kullanılabilir

Tag stratejisi:
1. Ana ürün kelimesi (örn: tişört)
2. Stil kelimesi (örn: vintage, modern)
3. Hedef kitle (örn: kadın, erkek)
4. Renk
5. Malzeme
6. Kullanım alanı
7. Kompozit taglar (örn: "kadın tişört", "vintage stil")
8. Nişe özel taglar`;

      let userPrompt = `Şu ürün için Etsy tagları oluştur:

Ürün: ${productName}
Tip: ${productType}
${keywords.length > 0 ? `Anahtar Kelimeler: ${keywords.join(', ')}` : ''}
${targetAudience ? `Hedef: ${targetAudience}` : ''}
${style ? `Stil: ${style}` : ''}
${color ? `Renk: ${color}` : ''}
${material ? `Malzeme: ${material}` : ''}
${occasion ? `Kullanım: ${occasion}` : ''}
${theme ? `Tema: ${theme}` : ''}

13 adet SEO-optimized tag oluştur. Her tag maksimum 20 karakter olmalı.
Sadece tagleri yaz, her satıra bir tag, numara veya işaret kullanma.`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8,
          max_tokens: 300
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      const tagsText = response.data.choices[0].message.content;
      
      // Tagleri satır satır ayır ve temizle
      const tags = tagsText
        .split('\n')
        .map(line => line.trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length <= 20)
        .filter(tag => !tag.match(/^\d+[\.\)]/)) // Numaraları çıkar
        .slice(0, 13); // Maksimum 13 tag

      logger.info(`Etsy tagleri başarıyla oluşturuldu: ${tags.length} adet`);
      
      return {
        tags,
        count: tags.length
      };

    } catch (error) {
      logger.error('Etsy tag oluşturma hatası:', error.response?.data || error.message);
      throw new Error('Tag oluşturma başarısız oldu');
    }
  }

  /**
   * Etsy için SEO-optimized ürün başlığı oluştur
   * OpenAI ChatGPT kullanarak Etsy için optimize edilmiş ürün başlığı üretir
   */
  async generateEtsyTitle(productInfo) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key bulunamadı');
      }

      const { 
        productName, 
        productType = 'tişört', 
        keywords = [], 
        targetAudience,
        style,
        color,
        size,
        occasion
      } = productInfo;

      logger.info(`Etsy başlığı oluşturuluyor: ${productName}`);

      // SEO odaklı prompt hazırla
      const systemPrompt = `Sen bir Etsy SEO uzmanısın. Görevin, Etsy'de üst sıralarda çıkacak, maksimum etkili ürün başlıkları oluşturmak.

Etsy başlık kuralları:
- Maksimum 140 karakter
- En önemli anahtar kelimeler başta olmalı
- Aşırı tekrar yapmadan anahtar kelimeleri kullan
- Virgül veya | ile ayırarak okunabilir yap
- Özel karakterlerden kaçın (Etsy kuralları)
- Her kelime değerli olmalı - gereksiz kelimeler kullanma
- Türkçe karakterler kullanılabilir

Başlık formatı örnekleri:
- "Vintage Çiçek Desenli Kadın Tişört | %100 Pamuk | Rahat Kesim"
- "Minimalist Tipografi Erkek Tişört - Siyah Beyaz - Unisex"
- "Boho Tarzı Oversize Tişört | Kadın | Yaz Koleksiyonu"`;

      let userPrompt = `Şu ürün için Etsy başlığı oluştur:

Ürün: ${productName}
Tip: ${productType}
${keywords.length > 0 ? `Anahtar Kelimeler: ${keywords.join(', ')}` : ''}
${targetAudience ? `Hedef: ${targetAudience}` : ''}
${style ? `Stil: ${style}` : ''}
${color ? `Renk: ${color}` : ''}
${size ? `Beden: ${size}` : ''}
${occasion ? `Kullanım: ${occasion}` : ''}

5 farklı başlık alternatifi oluştur. Her biri 140 karakter limiti içinde, SEO-optimized olmalı.
Sadece başlıkları yaz, numaralandır (1. 2. 3. vb.)`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.9,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      const titlesText = response.data.choices[0].message.content;
      
      // Başlıkları satır satır ayır ve temizle
      const titles = titlesText
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Numaraları kaldır (1., 2., 1), 2), vb.)
          return line.replace(/^\d+[\.\)]\s*/, '').trim();
        })
        .filter(title => title.length > 0 && title.length <= 140);

      logger.info(`Etsy başlıkları başarıyla oluşturuldu: ${titles.length} adet`);
      
      return {
        titles,
        count: titles.length
      };

    } catch (error) {
      logger.error('Etsy başlık oluşturma hatası:', error.response?.data || error.message);
      throw new Error('Başlık oluşturma başarısız oldu');
    }
  }

  /**
   * Etsy için SEO-optimized ürün açıklaması oluştur
   * OpenAI ChatGPT kullanarak Etsy için optimize edilmiş ürün açıklaması üretir
   */
  async generateEtsyDescription(productInfo) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key bulunamadı');
      }

      const { 
        productName, 
        productType = 'tişört', 
        keywords = [], 
        targetAudience, 
        style,
        material,
        features = [],
        tone = 'professional'
      } = productInfo;

      logger.info(`Etsy açıklaması oluşturuluyor: ${productName}`);

      // SEO odaklı prompt hazırla
      const systemPrompt = `Sen bir Etsy SEO uzmanısın. Görevin, tişört ve diğer tekstil ürünleri için Etsy'de üst sıralarda çıkacak, profesyonel ve çekici ürün açıklamaları oluşturmak. 

Açıklamalar şu özelliklere sahip olmalı:
- SEO açısından optimize edilmiş (önemli anahtar kelimeleri doğal bir şekilde kullan)
- İlk 160 karakter meta açıklama olarak kullanılabilir nitelikte olmalı
- Ürünün özelliklerini ve faydalarını vurgula
- Hedef kitleye hitap eden dil kullan
- Etsy'nin format kurallarına uygun
- Duygusal bağ kuran ve satışı teşvik eden
- Paragraflar ve madde işaretleri ile okunabilir
- 200-300 kelime arası olmalı`;

      let userPrompt = `Şu ürün için Etsy açıklaması oluştur:

Ürün Adı: ${productName}
Ürün Tipi: ${productType}
${keywords.length > 0 ? `Anahtar Kelimeler: ${keywords.join(', ')}` : ''}
${targetAudience ? `Hedef Kitle: ${targetAudience}` : ''}
${style ? `Stil: ${style}` : ''}
${material ? `Malzeme: ${material}` : ''}
${features.length > 0 ? `Özellikler: ${features.join(', ')}` : ''}
Ton: ${tone === 'casual' ? 'Samimi ve arkadaşça' : tone === 'enthusiastic' ? 'Coşkulu ve heyecanlı' : 'Profesyonel'}

Türkçe olarak, Etsy'de üst sıralara çıkacak şekilde optimize edilmiş bir ürün açıklaması yaz.`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000, // 45 seconds timeout for longer descriptions
        }
      );

      const description = response.data.choices[0].message.content;
      logger.info('Etsy açıklaması başarıyla oluşturuldu');
      
      return {
        description,
        characterCount: description.length,
        wordCount: description.split(/\s+/).length
      };

    } catch (error) {
      logger.error('Etsy açıklama oluşturma hatası:', error.response?.data || error.message);
      throw new Error('Açıklama oluşturma başarısız oldu');
    }
  }

  /**
   * Mockup Oluşturucu
   * Kullanıcının tasarımını seçtiği ürün üzerinde AI ile görselleştirir
   */
  async generateMockup(designPath, productType, productColor, options = {}) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key bulunamadı');
      }

      logger.info(`Mockup oluşturma başlatıldı: ${productType} - ${productColor}`);

      // Ürün tipleri ve açıklamaları
      const productDescriptions = {
        't-shirt': 'classic crew neck t-shirt',
        'hoodie': 'pullover hoodie with kangaroo pocket',
        'tank-top': 'athletic tank top',
        'long-sleeve': 'long sleeve crew neck shirt',
        'sweatshirt': 'classic crewneck sweatshirt',
        'mug': 'ceramic coffee mug',
        'tote-bag': 'canvas tote bag',
        'phone-case': 'phone case'
      };

      // Renk tanımlamaları
      const colorDescriptions = {
        'white': 'pure white',
        'black': 'solid black',
        'navy': 'navy blue',
        'gray': 'heather gray',
        'red': 'bright red',
        'blue': 'royal blue',
        'green': 'forest green',
        'yellow': 'sunshine yellow',
        'pink': 'soft pink',
        'purple': 'deep purple',
        'orange': 'vibrant orange',
        'brown': 'chocolate brown'
      };

      const productDesc = productDescriptions[productType] || 't-shirt';
      const colorDesc = colorDescriptions[productColor] || 'white';

      // Kullanıcının tasarımını base64'e çevir
      const designBuffer = fs.readFileSync(designPath);
      const designBase64 = designBuffer.toString('base64');

      // DALL-E için detaylı prompt oluştur
      const mockupPrompt = `A professional high-quality product mockup photograph of a ${colorDesc} ${productDesc}. 
The ${productDesc} is displayed in a clean, well-lit studio setting with soft shadows. 
The product is centered and shown from the front view, slightly angled for depth.
The fabric texture is realistic and detailed. 
The ${productDesc} has a custom graphic design printed on the center/front.
Professional product photography style, 4K quality, commercial grade mockup.
Clean white or minimal background. Photorealistic rendering.`;

      // DALL-E 3 ile mockup oluştur
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'dall-e-3',
          prompt: mockupPrompt,
          n: 1,
          size: options.size || '1024x1024',
          quality: 'hd',
          style: 'natural'
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000, // 60 seconds timeout
        }
      );

      const mockupUrl = response.data.data[0].url;

      // Oluşturulan mockup'ı indir
      const imageResponse = await axios.get(mockupUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 seconds timeout
      });
      const mockupBuffer = Buffer.from(imageResponse.data);

      // Kullanıcının tasarımını mockup üzerine yerleştir
      const designImage = await sharp(designPath)
        .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

      // Mockup ve tasarımı birleştir
      const compositeImage = await sharp(mockupBuffer)
        .composite([
          {
            input: designImage,
            top: 250, // Ürün üzerinde ortalanmış pozisyon
            left: 312,
            blend: 'over'
          }
        ])
        .jpeg({ quality: 90 })
        .toBuffer();

      logger.info('Mockup başarıyla oluşturuldu');
      
      return {
        imageBuffer: compositeImage,
        mockupUrl: mockupUrl,
        revisedPrompt: response.data.data[0].revised_prompt
      };

    } catch (error) {
      logger.error('Mockup oluşturma hatası:', error.response?.data || error.message);
      
      // Hata durumunda basit mockup oluştur
      if (error.response?.status === 429 || error.response?.status === 400) {
        logger.warn('DALL-E API hatası, basit mockup oluşturuluyor');
        return await this.generateSimpleMockup(designPath, productType, productColor);
      }
      
      throw new Error('Mockup oluşturma başarısız oldu');
    }
  }

  /**
   * Basit Mockup Oluşturucu (Fallback)
   * API hatası durumunda kullanılır
   */
  async generateSimpleMockup(designPath, productType, productColor) {
    try {
      logger.info('Basit mockup oluşturuluyor');

      // Renk kodları
      const colorCodes = {
        'white': '#FFFFFF',
        'black': '#000000',
        'navy': '#001f3f',
        'gray': '#808080',
        'red': '#FF4136',
        'blue': '#0074D9',
        'green': '#2ECC40',
        'yellow': '#FFDC00',
        'pink': '#FF69B4',
        'purple': '#B10DC9',
        'orange': '#FF851B',
        'brown': '#8B4513'
      };

      const bgColor = colorCodes[productColor] || '#FFFFFF';

      // Kullanıcının tasarımını oku ve yeniden boyutlandır
      const designImage = await sharp(designPath)
        .resize(500, 500, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

      // Basit ürün şablonu oluştur (dikdörtgen ürün mockup)
      const mockupWidth = 1024;
      const mockupHeight = 1024;
      
      // SVG ile basit bir tişört/ürün şekli oluştur
      const productSvg = `
        <svg width="${mockupWidth}" height="${mockupHeight}">
          <rect width="${mockupWidth}" height="${mockupHeight}" fill="#f5f5f5"/>
          <!-- Ürün gölgesi -->
          <ellipse cx="${mockupWidth/2}" cy="${mockupHeight - 100}" rx="300" ry="50" fill="#00000020"/>
          <!-- Ürün gövdesi -->
          <path d="M ${mockupWidth/2 - 200} 200 
                   L ${mockupWidth/2 - 250} 250 
                   L ${mockupWidth/2 - 230} 650 
                   Q ${mockupWidth/2 - 230} 700 ${mockupWidth/2 - 200} 700
                   L ${mockupWidth/2 + 200} 700
                   Q ${mockupWidth/2 + 230} 700 ${mockupWidth/2 + 230} 650
                   L ${mockupWidth/2 + 250} 250
                   L ${mockupWidth/2 + 200} 200
                   Q ${mockupWidth/2 + 150} 180 ${mockupWidth/2 + 100} 200
                   L ${mockupWidth/2 + 50} 250
                   L ${mockupWidth/2 - 50} 250
                   L ${mockupWidth/2 - 100} 200
                   Q ${mockupWidth/2 - 150} 180 ${mockupWidth/2 - 200} 200 Z"
                fill="${bgColor}" stroke="#00000020" stroke-width="2"/>
        </svg>
      `;

      // SVG'yi buffer'a çevir ve tasarımı üzerine yerleştir
      const mockupBase = await sharp(Buffer.from(productSvg))
        .png()
        .toBuffer();

      const finalMockup = await sharp(mockupBase)
        .composite([
          {
            input: designImage,
            top: 320,
            left: mockupWidth/2 - 250,
            blend: 'over'
          }
        ])
        .jpeg({ quality: 90 })
        .toBuffer();

      logger.info('Basit mockup başarıyla oluşturuldu');
      
      return {
        imageBuffer: finalMockup,
        mockupUrl: null,
        revisedPrompt: `Simple mockup for ${productType} in ${productColor}`
      };

    } catch (error) {
      logger.error('Basit mockup oluşturma hatası:', error);
      throw new Error('Mockup oluşturma başarısız oldu');
    }
  }

  /**
   * Geçici dosyaları temizle
   */
  async cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`Geçici dosya silindi: ${filePath}`);
        }
      } catch (error) {
        logger.error(`Dosya silme hatası: ${filePath}`, error);
      }
    }
  }
}

module.exports = new AIService();

