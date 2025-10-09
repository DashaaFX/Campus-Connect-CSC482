//Reusable form hook with validation
//Used for both login and registration forms

import { useState, useEffect } from "react";

export const useForm = (initialState = {}, error, clearError, validationRules = {}) => {
  const [input, setInput] = useState(initialState);
  const [errors, setErrors] = useState({});

  // Clear error when input changes
  useEffect(() => {
    if (error) clearError();
  }, [...Object.values(input), error, clearError]);

  const handleChange = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, fieldName = "file") => {
    setInput({ ...input, [fieldName]: e.target.files?.[0] });
  };

  const validate = () => {
    const newErrors = {};

    for (const field in validationRules) {
      const rules = validationRules[field];
      const value = input[field];

      if (rules.required && !value) {
        newErrors[field] = "This field is required";
        continue;
      }

      if (rules.pattern && value && !rules.pattern.value.test(value)) {
        newErrors[field] = rules.pattern.message;
      }

      if (rules.custom && value && !rules.custom(value)) {
        newErrors[field] = rules.customMessage || "Invalid value";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // true if valid
  };

  const resetForm = () => {
    setInput(initialState);
    setErrors({});
  };

  return { input, errors, handleChange, handleFileChange, resetForm, validate };
};

