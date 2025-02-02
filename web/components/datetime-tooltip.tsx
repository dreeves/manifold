import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import advanced from 'dayjs/plugin/advancedFormat'
import { ClientRender } from './client-render'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(advanced)

export function DateTimeTooltip(props: {
  time: number
  text?: string
  children?: React.ReactNode
}) {
  const { time, text } = props

  const formattedTime = dayjs(time).format('MMM DD, YYYY hh:mm a z')
  const toolTip = text ? `${text} ${formattedTime}` : formattedTime

  return (
    <>
      <ClientRender>
        <span
          className="tooltip hidden cursor-default sm:inline-block"
          data-tip={toolTip}
        >
          {props.children}
        </span>
      </ClientRender>
      <span className="whitespace-nowrap sm:hidden">{props.children}</span>
    </>
  )
}
