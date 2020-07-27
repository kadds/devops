const { Sequelize, DataTypes } = require('sequelize')

let storage = 'data.db'
const sequelize = new Sequelize({ dialect: 'sqlite', storage })

// platform
const m_vm = sequelize.define('vm', {
    name: {
        type:
            DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true,
    },
    ip: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    port: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    private_key: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    ctime: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    user: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    base_root: {
        type: DataTypes.STRING,
        allowNull: false,
    }
})

// module
const m_mode = sequelize.define('mode', {
    name: {
        type:
            DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true,
    },
    ctime: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    startup_script: {
        type: DataTypes.BLOB,
    },
    stop_script: {
        type: DataTypes.BLOB,
    },
    compilation_script: {
        type: DataTypes.BLOB,
    },
})

// module instance
const m_server = sequelize.define('server', {
    name: {
        type:
            DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true,
    },
    mode_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    vm_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    ctime: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    is_test: {
        type: DataTypes.TINYINT,
        allowNull: false,
    }
})


// pipeline for upload module
const m_pipeline = sequelize.define('pipeline', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        primaryKey: true,
        autoIncrement: true,
    },
    ctime: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    mode_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    stage: {
        // 0 create
        // 1 upload
        // 3 grayed
        // 4 full_upload
        // 5 full
        // 6 rollback
        // 7 finish

        type: DataTypes.INTEGER,
        allowNull: false,
    },
    test_server: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    previous_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    mark: {
        type: DataTypes.STRING,
        allowNull: false,
    }
})

const conn = sequelize

async function init() {
    await m_vm.sync()
    await m_mode.sync()
    await m_server.sync()
    await m_pipeline.sync()
}

module.exports = { conn, m_vm, m_mode, m_server, m_pipeline, init }