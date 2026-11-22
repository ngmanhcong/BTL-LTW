import { nameValidation } from './nameValidation';

test.each(['Nguyễn', 'Đỗ', 'Lê', 'An', 'Thị Ánh', 'Nguyễn'.normalize('NFD')])(
  'accepts Vietnamese name %s',
  async (name) => {
    expect(await nameValidation.validate(` ${name} `)).toBe(name.normalize('NFC'));
  }
);

test.each(['', ' ', 'A', 'a'.repeat(26), 'An123', '<script>', null])(
  'rejects invalid name %s',
  async (name) => {
    expect(await nameValidation.isValid(name)).toBe(false);
  }
);
