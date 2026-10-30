import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

import { TextField } from '../ui/FormField'

type TextFieldProps = ComponentProps<typeof TextField>
type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailing'>

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-paper-strong hover:text-ink"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      }
    />
  )
}
