const { Sequelize, DataTypes } = require('sequelize')
const crypto = require('crypto')

const iv = '2624750004598718'
function cipher(str, key, iv) {
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    return cipher.update(str, 'utf8', 'hex') + cipher.final('hex');
}

function decipher(str, key, iv) {
    key = Buffer.from(key)
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    return decipher.update(str, 'hex', 'utf8') + decipher.final('utf8');
}

let storage = 'data.db'
const sequelize = new Sequelize({
    dialect: 'sqlite', storage, pool: {
        max: 4,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    logging: () => { }
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
    salt: {
        type: DataTypes.STRING,
        allowNull: false,
        get() {
            return this.getDataValue('salt')
        }
    },
    port: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
    },
    ip: {
        type: DataTypes.STRING,
        allowNull: false,
        set(value) {
            this.setDataValue('ip', cipher(value, this.salt, iv))
        },
        get() {
            const ip = this.getDataValue('ip')
            if (ip !== undefined && ip !== null) {
                return decipher(ip, this.getDataValue('salt'), iv)
            }
            else {
                return ip
            }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
        set(value) {
            if (value !== null) {
                this.setDataValue('password', cipher(value, this.salt, iv))
            }
            else {
                this.setDataValue('password', null)
            }
        },
        get() {
            const pwd = this.getDataValue('password')
            if (pwd) {
                return decipher(pwd, this.getDataValue('salt'), iv)
            }
            else {
                return pwd
            }
        }
    },
    private_key: {
        type: DataTypes.STRING,
        allowNull: true,
        set(value) {
            if (value !== null) {
                this.setDataValue('private_key', cipher(value, this.salt, iv))
            }
            else {
                this.setDataValue('private_key', null)
            }
        },
        get() {
            const pk = this.getDataValue('private_key')
            if (pk !== undefined && pk !== null) {
                return decipher(this.getDataValue('private_key'), this.getDataValue('salt'), iv)
            }
            else {
                return pk
            }
        }
    },
}, {
    sequelize,
    timestamps: true,
    createdAt: 'ctime',
    updatedAt: 'mtime',
})


// module
const m_mode = sequelize.define('mode', {
    name: {
        type: DataTypes.STRING,
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
        // {"display_name": "", "desc": ""}
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
        type: DataTypes.STRING,
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
    content: {
        type: DataTypes.JSON,
        allowNull: false,
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
    content: {
        type: DataTypes.JSON,
        allowNull: false,
    }
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
    content: {
        type: DataTypes.JSON,
        allowNull: false,
    }
}, {
    sequelize,
    timestamps: true,
    createdAt: 'ctime',
    updatedAt: 'mtime',
    indexes: [{ fields: ['deploy_id', 'target_time', 'status'] }]
})

const m_variable = sequelize.define('variable_tb', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true,
    },
    value: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    user: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    flag: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
}, {
    sequelize,
    timestamps: true,
    createdAt: 'ctime',
    updatedAt: 'mtime',
    indexes: [{ fields: ['name', 'user'] }]
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
    await m_variable.sync()
    if (await m_user.findByPk('admin') === null) {
        await m_user.create({ username: 'admin', password: '123', content: {} })
    }
}

module.exports = { conn, m_vm, m_mode, m_server, m_pipeline, m_deploy, m_user, m_docker_cache, m_deploy_stream, m_variable, init }