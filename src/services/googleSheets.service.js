const { getSheetsClient } = require('../config/googleSheets');
const { formatDateForSheets } = require('../utils/helpers');
const { prisma } = require('../config/database');
const config = require('../config/env');
const logger = require('../utils/logger');

class GoogleSheetsService {
  constructor() {
    this.spreadsheetId = config.googleSheetsId;
    this.sheetName = null; // Will be auto-detected
  }

  // Auto-detect sheet name (first sheet in the spreadsheet)
  async getSheetName() {
    if (this.sheetName) return this.sheetName;

    const sheets = getSheetsClient();
    if (!sheets) return 'Sheet1'; // fallback

    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      // Get first sheet name
      const firstSheet = response.data.sheets[0];
      this.sheetName = firstSheet.properties.title;
      logger.info(`📋 Detected Google Sheet name: "${this.sheetName}"`);
      return this.sheetName;
    } catch (error) {
      logger.error('Error detecting sheet name:', error.message);
      this.sheetName = 'Sheet1'; // fallback to default
      return this.sheetName;
    }
  }

  // Append user to Google Sheets (OTOMATIK - REGISTER SONRASI)
  async appendUserToSheet(userData) {
    const sheets = getSheetsClient();
    
    if (!sheets) {
      logger.warn('⚠️ Google Sheets not initialized, skipping sync for user:', userData.email);
      logger.warn('💡 To enable Google Sheets sync:');
      logger.warn('   1. Create Google Cloud project');
      logger.warn('   2. Enable Google Sheets API');
      logger.warn('   3. Create Service Account & download JSON');
      logger.warn('   4. Save as config/google-credentials.json');
      logger.warn('   5. Share sheet with service account email');
      return { success: false, message: 'Google Sheets not configured' };
    }

    try {
      const sheetName = await this.getSheetName();
      
      const row = [
        userData.firstName || '',
        userData.lastName || '',
        userData.email || '',
        userData.etsyStoreUrl || '-',
        formatDateForSheets(userData.registeredAt || new Date()),
        'HAYIR', // Default: PrintNest Kayıt Olmuş = HAYIR
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:F`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [row],
        },
      });

      // Log sync
      await this.logSync(userData.id, 'user_registration', 'success');

      logger.info(`✅ User ${userData.email} automatically added to Google Sheets`);
      return { success: true, message: 'User synced to Google Sheets' };
    } catch (error) {
      logger.error('❌ Error appending to Google Sheets:', error.message);
      
      // Log failed sync
      await this.logSync(userData.id, 'user_registration', 'failed', error.message);
      
      return { success: false, message: error.message };
    }
  }

  // Update user in Google Sheets
  async updateUserInSheet(email, updates) {
    const sheets = getSheetsClient();
    
    if (!sheets) {
      logger.warn('Google Sheets not initialized, skipping update');
      return { success: false, message: 'Google Sheets not configured' };
    }

    try {
      const sheetName = await this.getSheetName();
      
      // Find row by email
      const rowIndex = await this.findUserRowByEmail(email);

      if (!rowIndex) {
        logger.warn(`User ${email} not found in Google Sheets`);
        return { success: false, message: 'User not found in sheet' };
      }

      // Prepare updates
      const updateRequests = [];

      // Update firstName (Column A)
      if (updates.firstName) {
        updateRequests.push({
          range: `${sheetName}!A${rowIndex}`,
          values: [[updates.firstName]],
        });
      }

      // Update lastName (Column B)
      if (updates.lastName) {
        updateRequests.push({
          range: `${sheetName}!B${rowIndex}`,
          values: [[updates.lastName]],
        });
      }

      // Update etsyStoreUrl (Column D)
      if (updates.etsyStoreUrl !== undefined) {
        updateRequests.push({
          range: `${sheetName}!D${rowIndex}`,
          values: [[updates.etsyStoreUrl || '-']],
        });
      }

      // Update printNestConfirmed (Column F)
      if (updates.printNestConfirmed !== undefined) {
        updateRequests.push({
          range: `${sheetName}!F${rowIndex}`,
          values: [[updates.printNestConfirmed ? 'EVET' : 'HAYIR']],
        });
      }

      // Execute batch update
      if (updateRequests.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            valueInputOption: 'RAW',
            data: updateRequests,
          },
        });
      }

      logger.info(`User ${email} updated in Google Sheets`);
      return { success: true, message: 'User updated in Google Sheets' };
    } catch (error) {
      logger.error('Error updating Google Sheets:', error.message);
      return { success: false, message: error.message };
    }
  }

  // Find user row by email
  async findUserRowByEmail(email) {
    const sheets = getSheetsClient();
    
    if (!sheets) {
      return null;
    }

    try {
      const sheetName = await this.getSheetName();
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!C:C`, // Email column
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return null;
      }

      // Find row index (skip header row)
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === email) {
          return i + 1; // +1 because sheets are 1-indexed
        }
      }

      return null;
    } catch (error) {
      logger.error('Error finding user in Google Sheets:', error.message);
      return null;
    }
  }

  // Mark user as PrintNest confirmed
  async markUserAsPrintNestConfirmed(email, userId) {
    try {
      const result = await this.updateUserInSheet(email, { printNestConfirmed: true });
      
      if (result.success) {
        // Log sync
        await this.logSync(userId, 'printnest_confirmation', 'success');
      } else {
        await this.logSync(userId, 'printnest_confirmation', 'failed', result.message);
      }

      return result;
    } catch (error) {
      logger.error('Error marking user as confirmed:', error.message);
      await this.logSync(userId, 'printnest_confirmation', 'failed', error.message);
      return { success: false, message: error.message };
    }
  }

  // Manual sync all users (DATABASE -> SHEET, sadece yeni kullanıcıları ekle)
  async syncAllUsers() {
    const sheets = getSheetsClient();
    
    if (!sheets) {
      logger.warn('Google Sheets not initialized, skipping sync');
      return { success: false, message: 'Google Sheets not configured' };
    }

    try {
      const sheetName = await this.getSheetName();
      
      // Get all users from database
      const users = await prisma.user.findMany({
        orderBy: { registeredAt: 'asc' },
      });

      // Get existing emails from sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!C:C`, // Email column
      });

      const existingEmails = new Set();
      if (response.data.values) {
        // Skip header row
        response.data.values.slice(1).forEach(row => {
          if (row[0]) existingEmails.add(row[0]);
        });
      }

      // Filter users that don't exist in sheet
      const newUsers = users.filter(user => !existingEmails.has(user.email));

      if (newUsers.length === 0) {
        logger.info('No new users to sync to Google Sheets');
        return { success: true, message: 'Senkronize edilecek yeni kullanıcı yok' };
      }

      // Prepare rows for new users
      const rows = newUsers.map((user) => [
        user.firstName,
        user.lastName,
        user.email,
        user.etsyStoreUrl || '-',
        formatDateForSheets(user.registeredAt),
        user.printNestConfirmed ? 'EVET' : 'HAYIR',
      ]);

      // Append new users (don't clear existing data)
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:F`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: rows,
        },
      });

      // Log sync
      await this.logSync(null, 'manual_sync', 'success', null);

      logger.info(`Synced ${newUsers.length} new users to Google Sheets`);
      return { success: true, message: `${newUsers.length} yeni kullanıcı senkronize edildi` };
    } catch (error) {
      logger.error('Error syncing all users:', error.message);
      await this.logSync(null, 'manual_sync', 'failed', error.message);
      return { success: false, message: error.message };
    }
  }

  // Import users from Google Sheets to Database (SHEET -> DATABASE)
  async importFromSheet() {
    const sheets = getSheetsClient();
    
    if (!sheets) {
      logger.warn('Google Sheets not initialized, skipping import');
      return { success: false, message: 'Google Sheets not configured' };
    }

    try {
      const sheetName = await this.getSheetName();
      
      // Get all rows from sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:F`,
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        logger.info('No users in Google Sheets to import');
        return { success: true, message: 'Sheet\'te içe aktarılacak kullanıcı yok' };
      }

      // Get existing emails from database
      const existingUsers = await prisma.user.findMany({
        select: { email: true },
      });
      const existingEmails = new Set(existingUsers.map(u => u.email));

      // Parse rows (skip header)
      const newUsers = [];
      const errors = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const [firstName, lastName, email, etsyStoreUrl, registeredAt, printNestConfirmed] = row;

        // Validate required fields
        if (!email || !firstName || !lastName) {
          errors.push(`Satır ${i + 1}: Email, ad ve soyad zorunludur`);
          continue;
        }

        // Skip if already exists in database
        if (existingEmails.has(email)) {
          logger.info(`User ${email} already exists in database, skipping`);
          continue;
        }

        // Prepare user data
        // Parse registeredAt date safely
        let parsedDate = new Date();
        if (registeredAt) {
          const tempDate = new Date(registeredAt);
          // Check if date is valid
          if (!isNaN(tempDate.getTime())) {
            parsedDate = tempDate;
          }
        }

        const userData = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          password: null, // No password - user must use "forgot password"
          phoneNumber: null,
          etsyStoreUrl: etsyStoreUrl && etsyStoreUrl !== '-' ? etsyStoreUrl : null,
          printNestConfirmed: printNestConfirmed === 'EVET',
          role: 'user',
          dailyTokens: 40,
          lastTokenReset: new Date(),
          registeredAt: parsedDate,
          hasActiveSubscription: false,
        };

        newUsers.push(userData);
      }

      if (newUsers.length === 0) {
        if (errors.length > 0) {
          return { success: false, message: 'İçe aktarma başarısız', errors };
        }
        return { success: true, message: 'Tüm kullanıcılar zaten database\'de mevcut' };
      }

      // Create users in database
      const createdUsers = await prisma.user.createMany({
        data: newUsers,
        skipDuplicates: true,
      });

      // Log sync
      await this.logSync(null, 'sheet_to_db_import', 'success', null);

      logger.info(`Imported ${createdUsers.count} users from Google Sheets to database`);
      
      return { 
        success: true, 
        message: `${createdUsers.count} kullanıcı içe aktarıldı. Bu kullanıcılar "Şifremi Unuttum" ile şifre belirleyebilir.`,
        imported: createdUsers.count,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      logger.error('Error importing from Google Sheets:', error.message);
      await this.logSync(null, 'sheet_to_db_import', 'failed', error.message);
      return { success: false, message: error.message };
    }
  }

  // Log sync to database
  async logSync(userId, syncType, status, errorMessage = null) {
    try {
      await prisma.googleSheetsSyncLog.create({
        data: {
          userId,
          syncType,
          status,
          errorMessage,
        },
      });
    } catch (error) {
      logger.error('Error logging sync:', error.message);
    }
  }

  // Process sheet update from webhook (SHEETS -> DATABASE)
  async processSheetUpdate(rowData) {
    try {
      logger.info('📥 Processing sheet update:', rowData);

      // Parse row data
      const {
        email,
        firstName,
        lastName,
        etsyStoreUrl,
        printNestConfirmed,
      } = rowData;

      // Validate required fields
      if (!email) {
        logger.error('❌ Email is required for sheet update');
        return { success: false, message: 'Email is required' };
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        logger.error(`❌ User not found: ${email}`);
        return { success: false, message: `Kullanıcı bulunamadı: ${email}` };
      }

      // Prepare update data
      const updateData = {};

      if (firstName !== undefined && firstName !== user.firstName) {
        updateData.firstName = firstName;
      }

      if (lastName !== undefined && lastName !== user.lastName) {
        updateData.lastName = lastName;
      }

      if (etsyStoreUrl !== undefined) {
        // Handle "-" as null/empty
        const normalizedUrl = etsyStoreUrl === '-' ? null : etsyStoreUrl;
        if (normalizedUrl !== user.etsyStoreUrl) {
          updateData.etsyStoreUrl = normalizedUrl;
        }
      }

      if (printNestConfirmed !== undefined) {
        // Convert "EVET"/"HAYIR" to boolean
        const isConfirmed = printNestConfirmed === 'EVET' || printNestConfirmed === true;
        if (isConfirmed !== user.printNestConfirmed) {
          updateData.printNestConfirmed = isConfirmed;
        }
      }

      // If no changes, skip update
      if (Object.keys(updateData).length === 0) {
        logger.info(`ℹ️ No changes detected for user: ${email}`);
        return { success: true, message: 'Değişiklik yok' };
      }

      // Update user in database
      await prisma.user.update({
        where: { email },
        data: updateData,
      });

      // Log sync
      await this.logSync(user.id, 'sheet_to_db_sync', 'success');

      logger.info(`✅ User ${email} updated from Google Sheets:`, updateData);
      return { 
        success: true, 
        message: 'Kullanıcı güncellendi', 
        updatedFields: Object.keys(updateData) 
      };
    } catch (error) {
      logger.error('❌ Error processing sheet update:', error.message);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new GoogleSheetsService();

