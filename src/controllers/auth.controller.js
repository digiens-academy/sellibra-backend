const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/helpers');

class AuthController {
  // @route   POST /api/auth/register
  // @desc    Register new user
  // @access  Public
  async register(req, res, next) {
    try {
      const { firstName, lastName, email, password, phoneNumber, etsyStoreUrl } = req.body;

      const result = await authService.register({
        firstName,
        lastName,
        email,
        password,
        phoneNumber,
        etsyStoreUrl,
      });

      return successResponse(
        res,
        result,
        'Kayıt başarılı! Hoş geldiniz.',
        201
      );
    } catch (error) {
      // E-posta zaten kayıtlı
      if (error.message === 'Bu e-posta adresi zaten kayıtlı') {
        return errorResponse(res, error.message, 400);
      }
      
      // Etsy URL hataları
      if (error.message.includes('Etsy mağaza URL')) {
        return errorResponse(res, error.message, 400);
      }
      
      // Diğer hatalar
      next(error);
    }
  }

  // @route   POST /api/auth/login
  // @desc    Login user
  // @access  Public
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      return successResponse(res, result, 'Giriş başarılı');
    } catch (error) {
      if (error.message === 'E-posta veya şifre hatalı') {
        return errorResponse(res, error.message, 401);
      }
      next(error);
    }
  }

  // @route   GET /api/auth/me
  // @desc    Get current user
  // @access  Private
  async getMe(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);

      return successResponse(res, { user }, 'Kullanıcı bilgileri');
    } catch (error) {
      next(error);
    }
  }

  // @route   POST /api/auth/logout
  // @desc    Logout user
  // @access  Private
  async logout(req, res) {
    // Token-based auth doesn't require server-side logout
    // Client should remove token from storage
    return successResponse(res, null, 'Çıkış başarılı');
  }
}

module.exports = new AuthController();

