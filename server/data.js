const { Sequelize, DataTypes } = require('sequelize')

let storage = 'data.db'
const sequelize = new Sequelize({
    dialect: 'sqlite', storage, pool: {
        max: 4,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
})

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
    },
    flag: {
        type: DataTypes.INTEGER,
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
    flag: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    dev_user: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        // json
        type: DataTypes.JSON,
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
    // init, stop, running, core, restart.
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    flag: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    content: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, {
    sequelize,
    timestamps: true,
    createdAt: 'ctime',
    updatedAt: 'mtime',
    indexes: [{ fields: ['mode_name'] }, { fields: ['vm_name'] }]
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
    // 0 1 2 3 4
    stage: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    mark: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    content: {
        type: DataTypes.JSON,
        allowNull: false,
    }
}, {
    sequelize,
    timestamps: true,
    createdAt: 'ctime',
    updatedAt: 'mtime',
    indexes: [{ fields: ['mode_name'] }]
})

const m_deploy = sequelize.define('deploy', {
    id: {
        type:
            DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        primaryKey: true,
        autoIncrement: true
    },
    version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    mode_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    pipeline_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    content: {
        // json
        type: DataTypes.JSON,
        allowNull: false
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

const m_docker_cache = sequelize.define('docker_cache', {
    mode_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    vm_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    docker_names: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    sequelize,
    timestamps: true,
    createdAt: 'ctime',
    updatedAt: 'mtime',
})

const m_deploy_stream = sequelize.define('deploy_stream', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        primaryKey: true,
        autoIncrement: true,
    },
    deploy_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    server: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    target_time: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    // 0 upload
    // 1 rollback
    op: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    sequelize,
    timestamps: true,
    createdAt: 'ctime',
    updatedAt: 'mtime',
    indexes: [{ fields: ['deploy_id', 'target_time', 'status'] }]
})

const conn = sequelize

async function init() {
    await m_vm.sync()
    await m_mode.sync()
    await m_server.sync()
    await m_pipeline.sync()
    await m_user.sync()
    await m_deploy.sync()
    await m_docker_cache.sync()
    await m_deploy_stream.sync()
    if (await m_user.findByPk('admin') === null) {
        await m_user.create({ username: 'admin', password: '123' })
    }
}

module.exports = { conn, m_vm, m_mode, m_server, m_pipeline, m_deploy, m_user, m_docker_cache, m_deploy_stream, init }