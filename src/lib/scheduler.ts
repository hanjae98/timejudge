import { addMinutes, isAfter, isBefore, startOfHour, addDays, setHours, setMinutes } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

interface ScheduleBlock {
    start: Date
    end: Date
}

/**
 * AI가 추정한 총 시간(minutes)을 가용 시간(AvailableSlots)에 맞춰 쪼개서 배치하는 알고리즘
 */
export function autoSchedule(
    totalMinutes: number,
    deadline: Date,
    blockedSlots: { start: Date; end: Date }[],
    searchRangeStart: Date = new Date(),
    userTimezone: string = 'UTC',
    fixedRoutines: any[] = [] // [{ startTime: 'HH:mm', endTime: 'HH:mm', daysOfWeek: [0,1,2,3,4,5,6] }]
): ScheduleBlock[] {
    const MIN_BLOCK_MINUTES = 30
    const BUFFER_MINUTES = 10
    const resultBlocks: ScheduleBlock[] = []
    let remainingMinutes = totalMinutes

    let currentPtr = startOfHour(addMinutes(searchRangeStart, 30))

    while (remainingMinutes > 0 && isBefore(currentPtr, deadline)) {
        if (isAfter(currentPtr, addDays(searchRangeStart, 14))) break

        // 1. 유저 시간대 기준으로 현재 시간 변환
        const zonedCurrent = toZonedTime(currentPtr, userTimezone)
        const currentHour = zonedCurrent.getHours()
        const currentMinutes = zonedCurrent.getMinutes()
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`
        const currentDay = zonedCurrent.getDay()

        // 2. 고정 루틴(Sleep, Work 등) 기반으로 막혀있는지 확인
        // 만약 fixedRoutines가 비어있다면 기본 22:00~09:00 차단
        let isRoutineBlocked = false
        if (fixedRoutines && fixedRoutines.length > 0) {
            isRoutineBlocked = fixedRoutines.some(routine => {
                const isDayMatch = routine.daysOfWeek ? routine.daysOfWeek.includes(currentDay) : true
                if (!isDayMatch) return false

                // 시간 비교 (자정 넘어가는 루틴 처리 필요할 수 있으나 MVP에선 단순 처리)
                return currentTimeStr >= routine.startTime && currentTimeStr < routine.endTime
            })
        } else {
            // Default Fallback: Block 22:00 - 09:00 in user's timezone
            isRoutineBlocked = (currentHour >= 22 || currentHour < 9)
        }

        if (isRoutineBlocked) {
            // 막혀있으면 30분 뒤로 이동 (이후 최적화 가능)
            currentPtr = addMinutes(currentPtr, 30)
            continue
        }

        // 3. 기존 일정(Blocked Slots)과 겹치는지 확인
        const isSlotBlocked = blockedSlots.some(slot =>
            (isAfter(currentPtr, slot.start) || currentPtr.getTime() === slot.start.getTime()) &&
            isBefore(currentPtr, slot.end)
        )

        if (isSlotBlocked) {
            const conflict = blockedSlots.find(slot => isBefore(currentPtr, slot.end) && (isAfter(currentPtr, slot.start) || currentPtr.getTime() === slot.start.getTime()))
            if (conflict) {
                currentPtr = addMinutes(conflict.end, BUFFER_MINUTES)
            } else {
                currentPtr = addMinutes(currentPtr, 30)
            }
            continue
        }

        // 4. 작업 블록 생성
        let nextObstacle = deadline
        blockedSlots.forEach(slot => {
            if (isAfter(slot.start, currentPtr) && isBefore(slot.start, nextObstacle)) {
                nextObstacle = slot.start
            }
        })

        const availableStretchMinutes = (nextObstacle.getTime() - currentPtr.getTime()) / (1000 * 60)

        if (availableStretchMinutes >= MIN_BLOCK_MINUTES) {
            const blockDuration = Math.min(remainingMinutes, availableStretchMinutes, 180)
            const blockEnd = addMinutes(currentPtr, blockDuration)

            resultBlocks.push({ start: new Date(currentPtr), end: new Date(blockEnd) })

            remainingMinutes -= blockDuration
            currentPtr = addMinutes(blockEnd, BUFFER_MINUTES)
        } else {
            currentPtr = addMinutes(nextObstacle, BUFFER_MINUTES)
        }
    }

    return resultBlocks
}
