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

function useInterval(callback, delay, dependence = []) {
    const savedCallback = useRef();

    useEffect(() => {
        savedCallback.current = callback;
    });

    useEffect(() => {
        function tick() {
            savedCallback.current();
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay, ...dependence]);
}

export { useEventListener, useInterval }