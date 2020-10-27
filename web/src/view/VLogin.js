import Login from './Login'
import { close_login } from '../state/action'
import { connect } from 'react-redux'

const mapStateToProps = state => {
    return {
        show: state.login.is_login_show
    }
}


const mapDispatchToProps = dispatch => {
    return {
        close_login_modal: (d) => {
            dispatch(close_login(d))
        }
    }
}

const VLogin = connect(
    mapStateToProps,
    mapDispatchToProps
)(Login)

export default VLogin

