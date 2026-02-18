import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function FormInput({ label, error, hint, required, style, ...props }: FormInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={Colors.gray}
        {...props}
      />
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {hint && !error && (
        <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
  );
}

interface FormTextareaProps extends FormInputProps {
  numberOfLines?: number;
}

export function FormTextarea({ numberOfLines = 4, style, ...props }: FormTextareaProps) {
  return (
    <FormInput
      {...props}
      multiline
      numberOfLines={numberOfLines}
      style={[{ height: numberOfLines * 24, textAlignVertical: 'top' }, style]}
    />
  );
}

interface FormErrorSummaryProps {
  errors: Record<string, string>;
}

export function FormErrorSummary({ errors }: FormErrorSummaryProps) {
  const errorList = Object.entries(errors).filter(([_, v]) => v);

  if (errorList.length === 0) return null;

  return (
    <View style={styles.summary}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryIcon}>⚠</Text>
        <Text style={styles.summaryTitle}>Please fix the following errors:</Text>
      </View>
      {errorList.map(([field, message]) => (
        <Text key={field} style={styles.summaryItem}>• {message}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#f87171',
    backgroundColor: '#fef2f2',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorIcon: {
    color: '#dc2626',
    marginRight: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
  },
  hint: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 4,
  },
  summary: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryIcon: {
    marginRight: 8,
    color: '#dc2626',
  },
  summaryTitle: {
    fontWeight: '600',
    color: '#991b1b',
  },
  summaryItem: {
    fontSize: 13,
    color: '#b91c1c',
    marginLeft: 8,
    marginTop: 2,
  },
});
