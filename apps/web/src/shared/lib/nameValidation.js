import * as Yup from 'yup';

export const nameValidation = Yup.string()
  .transform((value) => (typeof value === 'string' ? value.normalize('NFC').trim() : value))
  .required('Vui lòng nhập họ tên')
  .min(2, 'Họ tên phải có ít nhất 2 ký tự')
  .max(25, 'Họ tên không được vượt quá 25 ký tự')
  .matches(
    /^\p{L}[\p{L}\p{M}]*(?:\s+\p{L}[\p{L}\p{M}]*)*$/u,
    'Họ tên chỉ gồm chữ cái và khoảng trắng'
  );
