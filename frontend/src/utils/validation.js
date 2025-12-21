// frontend/src/utils/validation.js

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return null;
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters long';
  if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
  return null;
};

export const validateIMEI = (imei) => {
  if (!imei) return 'IMEI is required';
  if (!/^\d{15}$/.test(imei)) return 'IMEI must be exactly 15 digits';
  return null;
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateNumber = (value, fieldName, min = null, max = null) => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }
  
  if (min !== null && num < min) {
    return `${fieldName} must be at least ${min}`;
  }
  
  if (max !== null && num > max) {
    return `${fieldName} must be at most ${max}`;
  }
  
  return null;
};

export const validateLatitude = (lat) => {
  const num = Number(lat);
  if (isNaN(num)) return 'Latitude must be a valid number';
  if (num < -90 || num > 90) return 'Latitude must be between -90 and 90';
  return null;
};

export const validateLongitude = (lng) => {
  const num = Number(lng);
  if (isNaN(num)) return 'Longitude must be a valid number';
  if (num < -180 || num > 180) return 'Longitude must be between -180 and 180';
  return null;
};

export const validateURL = (url) => {
  if (!url) return null; // URL is optional
  try {
    new URL(url);
    return null;
  } catch {
    return 'Please enter a valid URL';
  }
};

export const validatePhone = (phone) => {
  if (!phone) return null; // Phone is optional
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    return 'Please enter a valid phone number';
  }
  return null;
};

export const validateForm = (values, validationRules) => {
  const errors = {};
  
  Object.keys(validationRules).forEach(field => {
    const value = values[field];
    const rules = validationRules[field];
    
    for (const rule of rules) {
      const error = rule(value, field);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  });
  
  return errors;
};

// Common validation rules
export const commonValidations = {
  email: [validateEmail],
  password: [validatePassword],
  imei: [validateIMEI],
  latitude: [validateLatitude],
  longitude: [validateLongitude],
  url: [validateURL],
  phone: [validatePhone],
  required: (fieldName) => [(value) => validateRequired(value, fieldName)],
  number: (fieldName, min, max) => [(value) => validateNumber(value, fieldName, min, max)]
}; 