import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as SliderPrimitive from '@radix-ui/react-slider'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import styles from './styles.module.scss'
import { useState } from 'react'

export const Root = DropdownMenuPrimitive.Root
export const SubRoot = DropdownMenuPrimitive.Sub

export const Trigger = DropdownMenuPrimitive.Trigger
export const SubTrigger = DropdownMenuPrimitive.SubTrigger

export const Content = ({ children, ...props }: DropdownMenuPrimitive.DropdownMenuContentProps) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content {...props} className={styles.content}>
        {children}
        {/*<DropdownMenuPrimitive.Arrow className={styles.arrow} />*/}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
}

export const SubContent = ({
  children,
  ...props
}: DropdownMenuPrimitive.DropdownMenuContentProps) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent {...props} className={styles.content}>
        {children}
        {/*<DropdownMenuPrimitive.Arrow className={styles.arrow} />*/}
      </DropdownMenuPrimitive.SubContent>
    </DropdownMenuPrimitive.Portal>
  )
}

export const Label = (props: DropdownMenuPrimitive.DropdownMenuLabelProps) => (
  <DropdownMenuPrimitive.Label {...props} className={styles.label} />
)

export const Item = (props: DropdownMenuPrimitive.DropdownMenuItemProps) => (
  <DropdownMenuPrimitive.Item {...props} className={styles.item} />
)

export const SliderItem = ({ value, onValueChange, ...props }: SliderPrimitive.SliderProps) => {
  const [forceTooltip, setForceTooltip] = useState(false)

  return (
    <DropdownMenuPrimitive.Item
      className={styles.item + ' ' + styles.sliderItem}
      onClick={(e) => e.preventDefault()}
    >
      <span>{props.children}</span>

      <SliderPrimitive.Root
        {...props}
        className={styles.slider}
        value={value}
        onValueChange={(value) => {
          setForceTooltip(true)
          if (onValueChange) onValueChange(value)
        }}
        onValueCommit={() => setForceTooltip(false)}
      >
        <SliderPrimitive.Track className={styles.sliderTrack}>
          <SliderPrimitive.Range className={styles.sliderRange} />
        </SliderPrimitive.Track>

        <TooltipPrimitive.Root delayDuration={0}>
          <TooltipPrimitive.Trigger asChild>
            <SliderPrimitive.Thumb className={styles.sliderThumb} />
          </TooltipPrimitive.Trigger>
          {/* @ts-expect-error weird typing */}
          <TooltipPrimitive.Portal forceMount={forceTooltip}>
            <TooltipPrimitive.Content
              align="center"
              side="bottom"
              avoidCollisions={false}
              className={styles.tooltipContent}
            >
              {value}%
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
      </SliderPrimitive.Root>
    </DropdownMenuPrimitive.Item>
  )
}

export const CheckboxItem = ({
  children,
  ...props
}: DropdownMenuPrimitive.DropdownMenuCheckboxItemProps) => {
  return (
    <DropdownMenuPrimitive.CheckboxItem {...props} className={styles.item}>
      <span>{children}</span>
      <DropdownMenuPrimitive.ItemIndicator>
        {props.checked === true && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="16"
            height="16"
            className={styles.indicator}
          >
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
          </svg>
        )}
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

export const RadioItem = ({
  children,
  ...props
}: DropdownMenuPrimitive.DropdownMenuRadioItemProps) => {
  return (
    <DropdownMenuPrimitive.RadioItem {...props} className={styles.item}>
      <span>{children}</span>
      <DropdownMenuPrimitive.ItemIndicator>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          className={styles.indicator}
        >
          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
        </svg>
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.RadioItem>
  )
}

export const CheckboxGroup = DropdownMenuPrimitive.CheckboxItem
export const RadioGroup = DropdownMenuPrimitive.RadioGroup

export const Separator = (props: DropdownMenuPrimitive.DropdownMenuSeparatorProps) => (
  <DropdownMenuPrimitive.Separator {...props} className={styles.divider} />
)

export const SubMenuChevron = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      className={styles.chevron}
    >
      <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"></path>
    </svg>
  )
}
