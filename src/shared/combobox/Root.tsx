import type { ReactNode, Ref } from 'react';
import { Part, type PartProps } from '../Part';
import { useMergedRefs } from '../useMergedRefs';
import { visuallyHidden } from '../visuallyHidden';
import { CoreContext } from './context';
import type { ComboboxCore, ComboboxStatus } from './useComboboxCore';

export interface ComboboxRootState {
  open: boolean;
  status: ComboboxStatus;
}

/** Renders a root element with the live region, and provides the core to the parts. */
export function RootPart({
  core,
  partProps,
  children,
  forwardedRef,
  extra,
}: {
  core: ComboboxCore<unknown>;
  partProps: PartProps<'div', ComboboxRootState>;
  children: ReactNode;
  forwardedRef: Ref<HTMLDivElement>;
  extra?: object | undefined;
}) {
  const mergedRef = useMergedRefs<HTMLDivElement>(core.rootRef, forwardedRef);
  const state: ComboboxRootState = { open: core.isOpen, status: core.status };
  return (
    <CoreContext.Provider value={core}>
      <Part
        tag="div"
        state={state}
        ours={{
          ...core.getRootProps(),
          ...extra,
          children: (
            <>
              {children}
              <div role="status" aria-live="polite" aria-atomic="true" style={visuallyHidden}>
                {core.statusMessage}
              </div>
            </>
          ),
        }}
        theirs={partProps}
        forwardedRef={mergedRef}
      />
    </CoreContext.Provider>
  );
}
