export const passwordRules = [
  {
    id: "length",
    label: "Tối thiểu 8 ký tự",
    test: (password) => password.length >= 8,
  },
  {
    id: "uppercase",
    label: "Có ít nhất 1 chữ hoa",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "Có ít nhất 1 chữ thường",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "Có ít nhất 1 chữ số",
    test: (password) => /\d/.test(password),
  },
];

export function getPasswordChecks(password) {
  return passwordRules.map((rule) => ({
    ...rule,
    valid: rule.test(password || ""),
  }));
}

export function isStrongPassword(password) {
  return getPasswordChecks(password).every((rule) => rule.valid);
}

export const passwordRuleMessage = "Mật khẩu phải dài tối thiểu 8 ký tự, có chữ hoa, chữ thường và số. Ví dụ: Datbn004.";
