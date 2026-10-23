import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { renderStoredWidget } from './update.tsx';

/** Called by Android when a widget is added, resized or due for its periodic update. */
export async function widgetTaskHandler({ widgetAction, renderWidget }: WidgetTaskHandlerProps): Promise<void> {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  renderWidget(await renderStoredWidget());
}
