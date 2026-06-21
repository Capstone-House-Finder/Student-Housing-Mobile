import GorhomBottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { forwardRef, useMemo, type ReactNode } from 'react';

export const BottomSheet = forwardRef<GorhomBottomSheet, { children: ReactNode; snapPoints?: string[] }>(
  ({ children, snapPoints }, ref) => {
    const points = useMemo(() => snapPoints ?? ['35%', '75%'], [snapPoints]);
    return (
      <GorhomBottomSheet
        ref={ref}
        index={-1}
        snapPoints={points}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          {children}
        </BottomSheetScrollView>
      </GorhomBottomSheet>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';
