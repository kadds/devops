use std::sync::atomic::{AtomicUsize, AtomicBool, Ordering};
use tokio::sync::broadcast;
use std::sync::Arc;

struct InnerContext {
    is_stop: AtomicBool,
    task_num: AtomicUsize,
}

impl InnerContext {
    pub fn new() -> Self {
        InnerContext {
            is_stop: AtomicBool::default(),
            task_num: AtomicUsize::default(),
        }
    }
}


#[derive(Debug, Clone, PartialEq)]
pub enum SignalType{
    Stop,
    Reload,
}

pub struct Context {
    signal_sender: broadcast::Sender<SignalType>,
    signal: Option<broadcast::Receiver<SignalType>>,
    inner: Arc<InnerContext>,
    final_stop_sender: broadcast::Sender<()>,
    final_stop: broadcast::Receiver<()>,
}

impl Context {
    pub fn new() -> Self {
        let (tx, rx) = broadcast::channel(1);
        let (ftx, frx) = broadcast::channel(1);
        Context {
            signal_sender:  tx,
            signal: Some(rx),
            inner: Arc::new(InnerContext::new()),
            final_stop_sender: ftx,
            final_stop: frx,
        }
    }
    pub fn stop(&mut self) {
        self.inner.is_stop.store(true, Ordering::SeqCst);
        let _ = self.signal_sender.send(SignalType::Stop);
    }

    pub fn reload(&mut self) {
        let _ = self.signal_sender.send(SignalType::Reload);
    }

    pub fn is_stop(&self) -> bool {
        self.inner.is_stop.load(Ordering::SeqCst)
    }

    pub fn task_finish(&mut self) {
        self.inner.task_num.fetch_sub(1, Ordering::SeqCst);
        if self.inner.is_stop.load(Ordering::SeqCst) 
            && self.inner.task_num.load(Ordering::SeqCst) == 0 {
            let _ = self.final_stop_sender.send(());
        }
    }
    pub fn fetch_signal(&mut self) -> &mut broadcast::Receiver<SignalType>{
        self.signal.as_mut().unwrap()
    }

    pub async fn wait_for_final_stop(&mut self) {
        let _ = self.final_stop.recv().await;
    }
}

impl Drop for Context{
    fn drop (&mut self) {
        self.task_finish();
    }
}

impl Clone for Context {
    fn clone(&self) -> Self {
        self.inner.task_num.fetch_add(1, Ordering::SeqCst);
        Context {
            signal_sender: self.signal_sender.clone(),
            signal: Some(self.signal_sender.subscribe()),
            inner: self.inner.clone(),
            final_stop_sender: self.final_stop_sender.clone(),
            final_stop: self.final_stop_sender.subscribe(),
        }
    }
}