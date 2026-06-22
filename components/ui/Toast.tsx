import ToastMessage, { BaseToast, ErrorToast, type ToastConfig } from 'react-native-toast-message';
import { Colors } from '@/constants/colors';

const toastConfig: ToastConfig = {
  success: (props) => <BaseToast {...props} style={{ borderLeftColor: Colors.brand.teal }} text1Style={{ fontWeight: '700' }} />,
  error: (props) => <ErrorToast {...props} style={{ borderLeftColor: '#dc2626' }} text1Style={{ fontWeight: '700' }} />,
  info: (props) => <BaseToast {...props} style={{ borderLeftColor: Colors.brand.magenta }} text1Style={{ fontWeight: '700' }} />
};

export function Toast() {
  return <ToastMessage config={toastConfig} />;
}
