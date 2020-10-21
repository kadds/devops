#[derive(Clone, PartialEq, Debug)]
pub enum Types {
    Nothing,
    ReloadServers,
    Stop,
    // inner
    InnerStopNet,
    InnerStopOk,
}
