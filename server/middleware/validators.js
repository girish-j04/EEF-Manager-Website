/**
 * Request Validation Middleware
 */

/**
 * Validate email request body
 */
export const validateEmailRequest = (req, res, next) => {
  const { from, to, subject, body } = req.body;

  const errors = [];

  if (!from || typeof from !== 'string' || !isValidEmail(from)) {
    errors.push('from: must be a valid email address');
  }

  if (!to) {
    errors.push('to: is required');
  } else if (Array.isArray(to)) {
    if (to.length === 0) {
      errors.push('to: array must not be empty');
    } else if (!to.every(isValidEmail)) {
      errors.push('to: all recipients must be valid email addresses');
    }
  } else if (typeof to !== 'string' || !isValidEmail(to)) {
    errors.push('to: must be a valid email address or array of email addresses');
  }

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    errors.push('subject: must be a non-empty string');
  }

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    errors.push('body: must be a non-empty string');
  }

  // Validate optional CC field
  if (req.body.cc) {
    const { cc } = req.body;
    if (Array.isArray(cc)) {
      if (!cc.every(isValidEmail)) {
        errors.push('cc: all recipients must be valid email addresses');
      }
    } else if (typeof cc !== 'string' || !isValidEmail(cc)) {
      errors.push('cc: must be a valid email address or array of email addresses');
    }
  }

  // Validate optional BCC field
  if (req.body.bcc) {
    const { bcc } = req.body;
    if (Array.isArray(bcc)) {
      if (!bcc.every(isValidEmail)) {
        errors.push('bcc: all recipients must be valid email addresses');
      }
    } else if (typeof bcc !== 'string' || !isValidEmail(bcc)) {
      errors.push('bcc: must be a valid email address or array of email addresses');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid email request',
      details: errors
    });
  }

  next();
};

/**
 * Simple email validation
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
