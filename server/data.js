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
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    private_key: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    user: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    base_dir: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {
    sequelize,
    timestamps: true,
    createdAt: 'ctime',
    updatedAt: 'mtime',
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
    startup_script: {
        type: DataTypes.BLOB,
    },
    stop_script: {
        type: DataTypes.BLOB,
    },
    compilation_script: {
        type: DataTypes.BLOB,
    },
    dev_user: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    sequelize,
    timestamps: true,
    createdAt: 'ctime',
    updatedAt: 'mtime',
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
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    is_test: {
        type: DataTypes.TINYINT,
        allowNull: false,
    }
}, {
    sequelize,
    timestamps: true,
    createdAt: 'ctime',
    updatedAt: 'mtime',
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
}, {
    sequelize,
    timestamps: true,
    createdAt: 'ctime',
    updatedAt: 'mtime',
})

const m_user = sequelize.define('user', {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    avatar: {
        type: DataTypes.STRING,
    },
    mark: {
        type: DataTypes.STRING,
    }
}, {
    sequelize,
    timestamps: true,
    createdAt: 'ctime',
    updatedAt: 'mtime',
})


const conn = sequelize

async function init() {
    await m_vm.sync()
    await m_mode.sync()
    await m_server.sync()
    await m_pipeline.sync()
    await m_user.sync()
    if (await m_user.findByPk('admin') === null) {
        await m_user.create({ username: 'admin', password: '123' })
    }
}

module.exports = { conn, m_vm, m_mode, m_server, m_pipeline, m_user, init }