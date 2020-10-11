import { useEffect, useRef } from 'react'

function useEventListener(eventName, handler, element = window) {
    const saveHandler = useRef()

    useEffect(() => {
        saveHandler.current = handler
    }, [handler])

    useEffect(
        () => {
            const isSupported = element && element.addEventListener
            if (!isSupported) {
                console.error('not support element ', element)
                return;
            }

            const eventListener = event => saveHandler.current(event)
            element.addEventListener(eventName, eventListener)
            return () => {
                element.removeEventListener(eventName, eventListener);
            }
        },
        [eventName, element]
    )
}

export { useEventListener }