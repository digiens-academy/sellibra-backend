const { body, param, validationResult } = require('express-validator');

// Validation middleware to check for errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// Common validation rules
const validators = {
  // Register validation
  register: [
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('Ad alanı zorunludur')
      .isLength({ min: 2 })
      .withMessage('Ad en az 2 karakter olmalıdır'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Soyad alanı zorunludur')
      .isLength({ min: 2 })
      .withMessage('Soyad en az 2 karakter olmalıdır'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('E-posta alanı zorunludur')
      .isEmail()
      .withMessage('Geçerli bir e-posta adresi giriniz')
      .normalizeEmail(),
    body('phoneNumber')
      .trim()
      .notEmpty()
      .withMessage('Telefon numarası zorunludur')
      .matches(/^[0-9]{10,15}$/)
      .withMessage('Geçerli bir telefon numarası giriniz (10-15 rakam)'),
    body('password')
      .notEmpty()
      .withMessage('Şifre alanı zorunludur')
      .isLength({ min: 6 })
      .withMessage('Şifre en az 6 karakter olmalıdır'),
    body('etsyStoreUrl')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .custom((value) => {
        // Eğer değer girilmişse, formatını kontrol et
        if (!value) return true; // Boş ise geç
        
        // Basit Etsy URL/shop name formatını kontrol et
        const etsyPattern = /etsy\.com\/shop\/[a-zA-Z0-9_-]+/i;
        const isShopName = /^[a-zA-Z0-9_-]{4,50}$/;
        
        if (etsyPattern.test(value) || isShopName.test(value)) {
          return true;
        }
        throw new Error('Geçerli bir Etsy mağaza URL\'si veya shop adı giriniz (örn: https://www.etsy.com/shop/yourshop veya yourshop)');
      }),
    validate,
  ],

  // Login validation
  login: [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('E-posta alanı zorunludur')
      .isEmail()
      .withMessage('Geçerli bir e-posta adresi giriniz')
      .normalizeEmail(),
    body('password').notEmpty().withMessage('Şifre alanı zorunludur'),
    validate,
  ],

  // Profile update validation
  updateProfile: [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Ad en az 2 karakter olmalıdır'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Soyad en az 2 karakter olmalıdır'),
    body('phoneNumber')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^[0-9]{10,15}$/)
      .withMessage('Geçerli bir telefon numarası giriniz (10-15 rakam)'),
    validate,
  ],

  // Track close validation
  trackClose: [
    body('sessionId').notEmpty().withMessage('Session ID zorunludur'),
    body('timeSpent')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Süre pozitif bir sayı olmalıdır'),
    validate,
  ],

  // Track interaction validation
  trackInteraction: [
    body('sessionId').notEmpty().withMessage('Session ID zorunludur'),
    validate,
  ],

  // User ID param validation
  userId: [
    param('id').isInt({ min: 1 }).withMessage('Geçerli bir kullanıcı ID giriniz'),
    validate,
  ],
};

module.exports = validators;

