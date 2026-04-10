'use client';

import * as React from 'react';
import { AnimatePresence, motion, type Transition } from 'motion/react';

import { cn } from '@/lib/utils';

type HighlightMode = 'children' | 'parent';

type Bounds = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const DEFAULT_BOUNDS_OFFSET: Bounds = {
  top: 0,
  left: 0,
  width: 0,
  height: 0,
};

type HighlightContextType<T extends string> = {
  as?: keyof HTMLElementTagNameMap;
  mode: HighlightMode;
  activeValue: T | null;
  setActiveValue: (value: T | null) => void;
  /** When using hover, restore to this after pointer leaves an item (controlled `value` / `defaultValue` on Highlight). */
  selectionValue: T | null;
  /** Parent mode + hover + controlled `value`: separate hover pill from route selection pill. */
  dualLayer: boolean;
  hoverActiveValue: T | null;
  setHoverActiveValue: (value: T | null) => void;
  setBounds: (bounds: DOMRect) => void;
  clearBounds: () => void;
  setSelectionBounds: (bounds: DOMRect) => void;
  setHoverBounds: (bounds: DOMRect) => void;
  clearSelectionBounds: () => void;
  clearHoverBounds: () => void;
  setSelectionActiveClassName: (className: string) => void;
  setHoverActiveClassName: (className: string) => void;
  id: string;
  hover: boolean;
  click: boolean;
  className?: string;
  style?: React.CSSProperties;
  activeClassName?: string;
  setActiveClassName: (className: string) => void;
  transition?: Transition;
  disabled?: boolean;
  enabled?: boolean;
  exitDelay?: number;
  forceUpdateBounds?: boolean;
};

const HighlightContext = React.createContext<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HighlightContextType<any> | undefined
>(undefined);

function useHighlight<T extends string>(): HighlightContextType<T> {
  const context = React.useContext(HighlightContext);
  if (!context) {
    throw new Error('useHighlight must be used within a HighlightProvider');
  }
  return context as unknown as HighlightContextType<T>;
}

type BaseHighlightProps<T extends React.ElementType = 'div'> = {
  as?: T;
  ref?: React.Ref<HTMLDivElement>;
  mode?: HighlightMode;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  className?: string;
  /** Parent + dual-layer: pill for the current route / controlled `value`. */
  selectionHighlightClassName?: string;
  /** Parent + dual-layer: pill that follows the pointer on hover. */
  hoverHighlightClassName?: string;
  style?: React.CSSProperties;
  transition?: Transition;
  hover?: boolean;
  click?: boolean;
  disabled?: boolean;
  enabled?: boolean;
  exitDelay?: number;
};

type ParentModeHighlightProps = {
  boundsOffset?: Partial<Bounds>;
  containerClassName?: string;
  forceUpdateBounds?: boolean;
};

type ControlledParentModeHighlightProps<T extends React.ElementType = 'div'> =
  BaseHighlightProps<T> &
    ParentModeHighlightProps & {
      mode: 'parent';
      controlledItems: true;
      children: React.ReactNode;
    };

type ControlledChildrenModeHighlightProps<T extends React.ElementType = 'div'> =
  BaseHighlightProps<T> & {
    mode?: 'children' | undefined;
    controlledItems: true;
    children: React.ReactNode;
  };

type UncontrolledParentModeHighlightProps<T extends React.ElementType = 'div'> =
  BaseHighlightProps<T> &
    ParentModeHighlightProps & {
      mode: 'parent';
      controlledItems?: false;
      itemsClassName?: string;
      children: React.ReactElement | React.ReactElement[];
    };

type UncontrolledChildrenModeHighlightProps<
  T extends React.ElementType = 'div',
> = BaseHighlightProps<T> & {
  mode?: 'children';
  controlledItems?: false;
  itemsClassName?: string;
  children: React.ReactElement | React.ReactElement[];
};

type HighlightProps<T extends React.ElementType = 'div'> =
  | ControlledParentModeHighlightProps<T>
  | ControlledChildrenModeHighlightProps<T>
  | UncontrolledParentModeHighlightProps<T>
  | UncontrolledChildrenModeHighlightProps<T>;

function Highlight<T extends React.ElementType = 'div'>({
  ref,
  ...props
}: HighlightProps<T>) {
  const {
    as: Component = 'div',
    children,
    value,
    defaultValue,
    onValueChange,
    className,
    selectionHighlightClassName,
    hoverHighlightClassName,
    style,
    transition = { type: 'spring', stiffness: 350, damping: 35 },
    hover = false,
    click = true,
    enabled = true,
    controlledItems,
    disabled = false,
    exitDelay = 200,
    mode = 'children',
  } = props;

  const localRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  const propsBoundsOffset = (props as ParentModeHighlightProps)?.boundsOffset;
  const boundsOffset = propsBoundsOffset ?? DEFAULT_BOUNDS_OFFSET;
  const boundsOffsetTop = boundsOffset.top ?? 0;
  const boundsOffsetLeft = boundsOffset.left ?? 0;
  const boundsOffsetWidth = boundsOffset.width ?? 0;
  const boundsOffsetHeight = boundsOffset.height ?? 0;

  const boundsOffsetRef = React.useRef({
    top: boundsOffsetTop,
    left: boundsOffsetLeft,
    width: boundsOffsetWidth,
    height: boundsOffsetHeight,
  });

  React.useEffect(() => {
    boundsOffsetRef.current = {
      top: boundsOffsetTop,
      left: boundsOffsetLeft,
      width: boundsOffsetWidth,
      height: boundsOffsetHeight,
    };
  }, [
    boundsOffsetTop,
    boundsOffsetLeft,
    boundsOffsetWidth,
    boundsOffsetHeight,
  ]);

  const [activeValue, setActiveValue] = React.useState<string | null>(
    value ?? defaultValue ?? null,
  );
  const [boundsState, setBoundsState] = React.useState<Bounds | null>(null);
  const [activeClassNameState, setActiveClassNameState] =
    React.useState<string>('');

  const [hoverActiveValue, setHoverActiveValue] = React.useState<
    string | null
  >(null);
  const [selectionBoundsState, setSelectionBoundsState] =
    React.useState<Bounds | null>(null);
  const [hoverBoundsState, setHoverBoundsState] = React.useState<Bounds | null>(
    null,
  );
  const [selectionActiveClassNameState, setSelectionActiveClassNameState] =
    React.useState('');
  const [hoverActiveClassNameState, setHoverActiveClassNameState] =
    React.useState('');

  const selectionValue: string | null =
    value !== undefined ? value ?? null : defaultValue ?? null;

  const dualLayer = Boolean(
    hover &&
      mode === 'parent' &&
      controlledItems &&
      value !== undefined,
  );

  const selectionTransition = transition;
  const hoverTransition = {
    type: 'spring' as const,
    stiffness: Math.min(
      ((transition as { stiffness?: number })?.stiffness ?? 350) + 80,
      560,
    ),
    damping: (transition as { damping?: number })?.damping ?? 35,
    mass: Math.max(
      ((transition as { mass?: number })?.mass ?? 1) * 0.85,
      0.55,
    ),
  };

  const safeSetActiveValue = (id: string | null) => {
    setActiveValue((prev) => {
      if (prev !== id) {
        onValueChange?.(id);
        return id;
      }
      return prev;
    });
  };

  const safeSetBoundsRef = React.useRef<
    ((bounds: DOMRect) => void) | undefined
  >(undefined);

  React.useEffect(() => {
    safeSetBoundsRef.current = (bounds: DOMRect) => {
      if (!localRef.current) return;

      const containerRect = localRef.current.getBoundingClientRect();
      const offset = boundsOffsetRef.current;
      const newBounds: Bounds = {
        top: bounds.top - containerRect.top + offset.top,
        left: bounds.left - containerRect.left + offset.left,
        width: bounds.width + offset.width,
        height: bounds.height + offset.height,
      };

      setBoundsState((prev) => {
        if (
          prev &&
          prev.top === newBounds.top &&
          prev.left === newBounds.left &&
          prev.width === newBounds.width &&
          prev.height === newBounds.height
        ) {
          return prev;
        }
        return newBounds;
      });
    };
  });

  const safeSetBounds = (bounds: DOMRect) => {
    safeSetBoundsRef.current?.(bounds);
  };

  const clearBounds = React.useCallback(() => {
    setBoundsState((prev) => (prev === null ? prev : null));
  }, []);

  const rectToLocalBounds = React.useCallback((bounds: DOMRect): Bounds | null => {
    if (!localRef.current) return null;
    const containerRect = localRef.current.getBoundingClientRect();
    const offset = boundsOffsetRef.current;
    return {
      top: bounds.top - containerRect.top + offset.top,
      left: bounds.left - containerRect.left + offset.left,
      width: bounds.width + offset.width,
      height: bounds.height + offset.height,
    };
  }, []);

  const mergeBounds = (prev: Bounds | null, next: Bounds) => {
    if (
      prev &&
      prev.top === next.top &&
      prev.left === next.left &&
      prev.width === next.width &&
      prev.height === next.height
    ) {
      return prev;
    }
    return next;
  };

  const setSelectionBounds = React.useCallback(
    (rect: DOMRect) => {
      const newBounds = rectToLocalBounds(rect);
      if (!newBounds) return;
      setSelectionBoundsState((prev) => mergeBounds(prev, newBounds));
    },
    [rectToLocalBounds],
  );

  const setHoverBounds = React.useCallback(
    (rect: DOMRect) => {
      const newBounds = rectToLocalBounds(rect);
      if (!newBounds) return;
      setHoverBoundsState((prev) => mergeBounds(prev, newBounds));
    },
    [rectToLocalBounds],
  );

  const clearSelectionBounds = React.useCallback(() => {
    setSelectionBoundsState((prev) => (prev === null ? prev : null));
  }, []);

  const clearHoverBounds = React.useCallback(() => {
    setHoverBoundsState((prev) => (prev === null ? prev : null));
  }, []);

  React.useEffect(() => {
    if (value !== undefined) setActiveValue(value);
    else if (defaultValue !== undefined) setActiveValue(defaultValue);
  }, [value, defaultValue]);

  React.useEffect(() => {
    if (!dualLayer) return;
    if (selectionValue == null) {
      clearSelectionBounds();
    }
  }, [dualLayer, selectionValue, clearSelectionBounds]);

  React.useEffect(() => {
    if (!dualLayer) return;
    if (hoverActiveValue == null) {
      clearHoverBounds();
    }
  }, [dualLayer, hoverActiveValue, clearHoverBounds]);

  const id = React.useId();

  React.useEffect(() => {
    if (mode !== 'parent') return;
    const container = localRef.current;
    if (!container) return;

    const onScroll = () => {
      if (dualLayer) {
        if (selectionValue) {
          const els = container.querySelectorAll<HTMLElement>(
            '[data-highlight="true"]',
          );
          for (const el of els) {
            if (el.getAttribute('data-value') === selectionValue) {
              setSelectionBounds(el.getBoundingClientRect());
              break;
            }
          }
        }
        if (hoverActiveValue) {
          const els = container.querySelectorAll<HTMLElement>(
            '[data-highlight="true"]',
          );
          for (const el of els) {
            if (el.getAttribute('data-value') === hoverActiveValue) {
              setHoverBounds(el.getBoundingClientRect());
              break;
            }
          }
        }
        return;
      }
      if (!activeValue) return;
      const activeEl = container.querySelector<HTMLElement>(
        `[data-value="${activeValue}"][data-highlight="true"]`,
      );
      if (activeEl)
        safeSetBoundsRef.current?.(activeEl.getBoundingClientRect());
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [
    mode,
    activeValue,
    dualLayer,
    selectionValue,
    hoverActiveValue,
    setSelectionBounds,
    setHoverBounds,
  ]);

  const defaultSelectionClass =
    'pointer-events-none rounded-lg bg-primary/10 shadow-[inset_0_0_0_1px] shadow-primary/15 dark:bg-primary/14';
  const defaultHoverClass =
    'pointer-events-none rounded-lg bg-primary/18 shadow-[inset_0_0_0_1px] shadow-primary/28 dark:bg-primary/24';

  const render = (children: React.ReactNode) => {
    if (mode === 'parent') {
      if (dualLayer) {
        const selCls =
          selectionHighlightClassName ?? className ?? defaultSelectionClass;
        const hovCls = hoverHighlightClassName ?? defaultHoverClass;
        return (
          <Component
            ref={localRef}
            data-slot="motion-highlight-container"
            style={{ position: 'relative', zIndex: 1 }}
            className={(props as ParentModeHighlightProps)?.containerClassName}
          >
            <AnimatePresence initial={false}>
              {selectionBoundsState && (
                <motion.div
                  data-slot="motion-highlight-selection"
                  animate={{
                    top: selectionBoundsState.top,
                    left: selectionBoundsState.left,
                    width: selectionBoundsState.width,
                    height: selectionBoundsState.height,
                    opacity: 1,
                  }}
                  initial={false}
                  exit={{
                    opacity: 0,
                    transition: {
                      ...selectionTransition,
                      delay:
                        ((transition as { delay?: number })?.delay ?? 0) +
                        (exitDelay ?? 0) / 1000,
                    },
                  }}
                  transition={selectionTransition}
                  style={{ position: 'absolute', zIndex: 0, ...style }}
                  className={cn(selCls, selectionActiveClassNameState)}
                />
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {hoverBoundsState && (
                <motion.div
                  data-slot="motion-highlight-hover"
                  animate={{
                    top: hoverBoundsState.top,
                    left: hoverBoundsState.left,
                    width: hoverBoundsState.width,
                    height: hoverBoundsState.height,
                    opacity: 1,
                  }}
                  initial={{ opacity: 0 }}
                  exit={{
                    opacity: 0,
                    transition: {
                      ...hoverTransition,
                      delay:
                        ((transition as { delay?: number })?.delay ?? 0) +
                        (exitDelay ?? 0) / 1000,
                    },
                  }}
                  transition={hoverTransition}
                  style={{ position: 'absolute', zIndex: 1, ...style }}
                  className={cn(hovCls, hoverActiveClassNameState)}
                />
              )}
            </AnimatePresence>
            {children}
          </Component>
        );
      }

      return (
        <Component
          ref={localRef}
          data-slot="motion-highlight-container"
          style={{ position: 'relative', zIndex: 1 }}
          className={(props as ParentModeHighlightProps)?.containerClassName}
        >
          <AnimatePresence initial={false} mode="wait">
            {boundsState && (
              <motion.div
                data-slot="motion-highlight"
                animate={{
                  top: boundsState.top,
                  left: boundsState.left,
                  width: boundsState.width,
                  height: boundsState.height,
                  opacity: 1,
                }}
                initial={{
                  top: boundsState.top,
                  left: boundsState.left,
                  width: boundsState.width,
                  height: boundsState.height,
                  opacity: 0,
                }}
                exit={{
                  opacity: 0,
                  transition: {
                    ...transition,
                    delay: (transition?.delay ?? 0) + (exitDelay ?? 0) / 1000,
                  },
                }}
                transition={transition}
                style={{ position: 'absolute', zIndex: 0, ...style }}
                className={cn(className, activeClassNameState)}
              />
            )}
          </AnimatePresence>
          {children}
        </Component>
      );
    }

    return children;
  };

  return (
    <HighlightContext.Provider
      value={{
        mode,
        activeValue,
        setActiveValue: safeSetActiveValue,
        selectionValue,
        dualLayer,
        hoverActiveValue,
        setHoverActiveValue,
        id,
        hover,
        click,
        className,
        style,
        transition,
        disabled,
        enabled,
        exitDelay,
        setBounds: safeSetBounds,
        clearBounds,
        setSelectionBounds,
        setHoverBounds,
        clearSelectionBounds,
        clearHoverBounds,
        setSelectionActiveClassName: setSelectionActiveClassNameState,
        setHoverActiveClassName: setHoverActiveClassNameState,
        activeClassName: activeClassNameState,
        setActiveClassName: setActiveClassNameState,
        forceUpdateBounds: (props as ParentModeHighlightProps)
          ?.forceUpdateBounds,
      }}
    >
      {enabled
        ? controlledItems
          ? render(children)
          : render(
              React.Children.map(children, (child, index) => (
                <HighlightItem key={index} className={props?.itemsClassName}>
                  {child}
                </HighlightItem>
              )),
            )
        : children}
    </HighlightContext.Provider>
  );
}

function getNonOverridingDataAttributes(
  element: React.ReactElement,
  dataAttributes: Record<string, unknown>,
): Record<string, unknown> {
  return Object.keys(dataAttributes).reduce<Record<string, unknown>>(
    (acc, key) => {
      if ((element.props as Record<string, unknown>)[key] === undefined) {
        acc[key] = dataAttributes[key];
      }
      return acc;
    },
    {},
  );
}

type ExtendedChildProps = React.ComponentProps<'div'> & {
  id?: string;
  ref?: React.Ref<HTMLElement>;
  'data-active'?: string;
  'data-value'?: string;
  'data-disabled'?: boolean;
  'data-highlight'?: boolean;
  'data-slot'?: string;
};

type HighlightItemProps<T extends React.ElementType = 'div'> =
  React.ComponentProps<T> & {
    as?: T;
    children: React.ReactElement;
    id?: string;
    value?: string;
    className?: string;
    style?: React.CSSProperties;
    transition?: Transition;
    activeClassName?: string;
    disabled?: boolean;
    exitDelay?: number;
    asChild?: boolean;
    forceUpdateBounds?: boolean;
  };

function HighlightItem<T extends React.ElementType>({
  ref,
  as,
  children,
  id,
  value,
  className,
  style,
  transition,
  disabled = false,
  activeClassName,
  exitDelay,
  asChild = false,
  forceUpdateBounds,
  ...props
}: HighlightItemProps<T>) {
  const itemId = React.useId();
  const {
    activeValue,
    setActiveValue,
    selectionValue,
    dualLayer,
    hoverActiveValue,
    setHoverActiveValue,
    mode,
    setBounds,
    clearBounds,
    setSelectionBounds,
    setHoverBounds,
    hover,
    click,
    enabled,
    className: contextClassName,
    style: contextStyle,
    transition: contextTransition,
    id: contextId,
    disabled: contextDisabled,
    exitDelay: contextExitDelay,
    forceUpdateBounds: contextForceUpdateBounds,
    setActiveClassName,
    setSelectionActiveClassName,
    setHoverActiveClassName,
  } = useHighlight();

  const Component = as ?? 'div';
  const element = children as React.ReactElement<ExtendedChildProps>;
  const childValue =
    id ?? value ?? element.props?.['data-value'] ?? element.props?.id ?? itemId;
  const isSelectionActive =
    dualLayer && selectionValue != null && childValue === selectionValue;
  const isHoverActive =
    dualLayer && hoverActiveValue != null && childValue === hoverActiveValue;
  const isActive = dualLayer ? isSelectionActive : activeValue === childValue;
  const isDisabled = disabled === undefined ? contextDisabled : disabled;
  const itemTransition = transition ?? contextTransition;

  const localRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  const refCallback = React.useCallback((node: HTMLElement | null) => {
    localRef.current = node as HTMLDivElement;
  }, []);

  React.useEffect(() => {
    if (mode !== 'parent' || !dualLayer) return;
    if (!isSelectionActive || !localRef.current) return;
    setSelectionBounds(localRef.current.getBoundingClientRect());
    setSelectionActiveClassName(activeClassName ?? '');
  }, [
    mode,
    dualLayer,
    isSelectionActive,
    childValue,
    selectionValue,
    activeClassName,
    setSelectionBounds,
    setSelectionActiveClassName,
  ]);

  React.useEffect(() => {
    if (mode !== 'parent' || !dualLayer) return;
    if (!isHoverActive || !localRef.current) return;
    setHoverBounds(localRef.current.getBoundingClientRect());
    setHoverActiveClassName('');
  }, [
    mode,
    dualLayer,
    isHoverActive,
    childValue,
    hoverActiveValue,
    setHoverBounds,
    setHoverActiveClassName,
  ]);

  React.useEffect(() => {
    if (mode !== 'parent' || dualLayer) return;

    let rafId: number;
    let previousBounds: Bounds | null = null;
    const shouldUpdateBounds =
      forceUpdateBounds === true ||
      (contextForceUpdateBounds && forceUpdateBounds !== false);

    const updateBounds = () => {
      if (!localRef.current) return;

      const bounds = localRef.current.getBoundingClientRect();

      if (shouldUpdateBounds) {
        if (
          previousBounds &&
          previousBounds.top === bounds.top &&
          previousBounds.left === bounds.left &&
          previousBounds.width === bounds.width &&
          previousBounds.height === bounds.height
        ) {
          rafId = requestAnimationFrame(updateBounds);
          return;
        }
        previousBounds = bounds;
        rafId = requestAnimationFrame(updateBounds);
      }

      setBounds(bounds);
    };

    if (isActive) {
      updateBounds();
      setActiveClassName(activeClassName ?? '');
    } else if (!activeValue) clearBounds();

    if (shouldUpdateBounds) return () => cancelAnimationFrame(rafId);
  }, [
    mode,
    isActive,
    activeValue,
    setBounds,
    clearBounds,
    activeClassName,
    setActiveClassName,
    forceUpdateBounds,
    contextForceUpdateBounds,
  ]);

  if (!React.isValidElement(children)) return children;

  const dataAttributes = {
    'data-active': isActive ? 'true' : 'false',
    'aria-selected': isActive,
    'data-disabled': isDisabled,
    'data-value': childValue,
    'data-highlight': true,
  };

  const commonHandlers = hover
    ? dualLayer
      ? {
          onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
            setHoverActiveValue(childValue);
            element.props.onMouseEnter?.(e);
          },
          onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
            setHoverActiveValue(null);
            element.props.onMouseLeave?.(e);
          },
        }
      : {
          onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
            setActiveValue(childValue);
            element.props.onMouseEnter?.(e);
          },
          onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
            setActiveValue(selectionValue ?? null);
            element.props.onMouseLeave?.(e);
          },
        }
    : click
      ? {
          onClick: (e: React.MouseEvent<HTMLDivElement>) => {
            setActiveValue(childValue);
            element.props.onClick?.(e);
          },
        }
      : {};

  if (asChild) {
    if (mode === 'children') {
      return React.cloneElement(
        element,
        {
          key: childValue,
          ref: refCallback,
          className: cn('relative', element.props.className),
          ...getNonOverridingDataAttributes(element, {
            ...dataAttributes,
            'data-slot': 'motion-highlight-item-container',
          }),
          ...commonHandlers,
          ...props,
        },
        <>
          <AnimatePresence initial={false} mode="wait">
            {isActive && !isDisabled && (
              <motion.div
                layoutId={`transition-background-${contextId}`}
                data-slot="motion-highlight"
                style={{
                  position: 'absolute',
                  zIndex: 0,
                  ...contextStyle,
                  ...style,
                }}
                className={cn(contextClassName, activeClassName)}
                transition={itemTransition}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{
                  opacity: 0,
                  transition: {
                    ...itemTransition,
                    delay:
                      (itemTransition?.delay ?? 0) +
                      (exitDelay ?? contextExitDelay ?? 0) / 1000,
                  },
                }}
                {...dataAttributes}
              />
            )}
          </AnimatePresence>

          <Component
            data-slot="motion-highlight-item"
            style={{ position: 'relative', zIndex: 1 }}
            className={className}
            {...dataAttributes}
          >
            {children}
          </Component>
        </>,
      );
    }

    return React.cloneElement(element, {
      ref: refCallback,
      ...getNonOverridingDataAttributes(element, {
        ...dataAttributes,
        'data-slot': 'motion-highlight-item',
      }),
      ...commonHandlers,
    });
  }

  return enabled ? (
    <Component
      key={childValue}
      ref={localRef}
      data-slot="motion-highlight-item-container"
      className={cn(mode === 'children' && 'relative', className)}
      {...dataAttributes}
      {...props}
      {...commonHandlers}
    >
      {mode === 'children' && (
        <AnimatePresence initial={false} mode="wait">
          {isActive && !isDisabled && (
            <motion.div
              layoutId={`transition-background-${contextId}`}
              data-slot="motion-highlight"
              style={{
                position: 'absolute',
                zIndex: 0,
                ...contextStyle,
                ...style,
              }}
              className={cn(contextClassName, activeClassName)}
              transition={itemTransition}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: {
                  ...itemTransition,
                  delay:
                    (itemTransition?.delay ?? 0) +
                    (exitDelay ?? contextExitDelay ?? 0) / 1000,
                },
              }}
              {...dataAttributes}
            />
          )}
        </AnimatePresence>
      )}

      {React.cloneElement(element, {
        style: { position: 'relative', zIndex: 1 },
        className: element.props.className,
        ...getNonOverridingDataAttributes(element, {
          ...dataAttributes,
          'data-slot': 'motion-highlight-item',
        }),
      })}
    </Component>
  ) : (
    children
  );
}

export {
  Highlight,
  HighlightItem,
  useHighlight,
  type HighlightProps,
  type HighlightItemProps,
};
