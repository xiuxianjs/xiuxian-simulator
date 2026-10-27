import { ExposeError } from 'alemonjs';
export const confirmationReferenceSchema = { type: 'string' as const, minLength: 1, maxLength: 64 };
export function validateConfirmationReference(value: string, kind: 'a' | 'f' | 't' | 'h' | 's' | 'p' | 'r') {
  if (!new RegExp(`^r1_[a-z0-9]+_${kind}_[a-z0-9]+_[a-f0-9]{24}$`).test(value)) {
    throw new ExposeError('INVALID_INPUT', '请提供服务端原预览返回的完整确认引用');
  }
}
