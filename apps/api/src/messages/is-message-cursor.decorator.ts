import { registerDecorator } from 'class-validator';
import { decodeCursor } from './message-cursor.js';

export function IsMessageCursor(): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isMessageCursor',
      target: target.constructor,
      propertyName: String(propertyName),
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && decodeCursor(value) !== null,
        defaultMessage: () => 'cursor must be a nextCursor value',
      },
    });
  };
}
