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

  // @route   POST /api/auth/forgot-password
  // @desc    Request password reset
  // @access  Public
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return errorResponse(res, 'E-posta adresi gereklidir', 400);
      }

      const result = await authService.requestPasswordReset(email);

      return successResponse(res, result, result.message);
    } catch (error) {
      if (error.message.includes('E-posta gönderilemedi')) {
        return errorResponse(res, error.message, 500);
      }
      next(error);
    }
  }

  // @route   GET /api/auth/verify-reset-token/:token
  // @desc    Verify password reset token
  // @access  Public
  async verifyResetToken(req, res, next) {
    try {
      const { token } = req.params;

      const result = await authService.verifyResetToken(token);

      return successResponse(res, result, 'Token geçerli');
    } catch (error) {
      if (error.message.includes('Geçersiz veya süresi dolmuş token')) {
        return errorResponse(res, error.message, 400);
      }
      next(error);
    }
  }

  // @route   POST /api/auth/reset-password
  // @desc    Reset password with token
  // @access  Public
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return errorResponse(res, 'Token ve yeni şifre gereklidir', 400);
      }

      if (newPassword.length < 6) {
        return errorResponse(res, 'Şifre en az 6 karakter olmalıdır', 400);
      }

      const result = await authService.resetPassword(token, newPassword);

      return successResponse(res, result, result.message);
    } catch (error) {
      if (error.message.includes('Geçersiz veya süresi dolmuş token')) {
        return errorResponse(res, error.message, 400);
      }
      next(error);
    }
  }
}

module.exports = new AuthController();

