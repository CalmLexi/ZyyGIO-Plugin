import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import Yaml from 'yaml'
import { admin } from './rule.js'
import { getScenes, getmode } from './index.js'
import { exec } from "child_process"

let _path = process.cwd() + '/plugins/Zyy-GM-plugin/config'
let _otherpath = process.cwd() + '/config/config/other.yaml'

export class hk4e extends plugin {
  constructor() {
    super({
      name: 'hk4e-admin',
      dsc: 'hk4e-超级管理',
      event: 'message',
      priority: -100,
      rule: admin
    })
  }

  async 开启GM(e) {
    const config = Yaml.parse(fs.readFileSync(_path + '/config.yaml', 'utf8'))
    const server = Yaml.parse(fs.readFileSync(_path + '/server.yaml', 'utf8'))
    const { value, scenes } = await getScenes(e)
    const modeEnabled = config[scenes]?.mode
    if (modeEnabled === true) {
      e.reply(`GM在此${value}已经启用，请不要重复启用`)
      return
    }
    if (modeEnabled === false) {
      config[scenes].mode = true
      fs.writeFileSync(_path + '/config.yaml', Yaml.stringify(config))
      e.reply("GM当前状态：启用")
      return
    }
    if (modeEnabled === undefined) {
      const cfg = server[Object.keys(server)[0]]
      config[scenes] = {
        mode: true,
        server: cfg,
        Administrator: [e.user_id.toString()],
        uid: [
          { [e.user_id]: '10002' }
        ]
      }
      fs.writeFileSync(_path + '/config.yaml', Yaml.stringify(config))
      const mail = Yaml.parse(fs.readFileSync(_path + '/full_server_mail.yaml', 'utf8'))
      mail[scenes] = ['100001']
      fs.writeFileSync(_path + '/full_server_mail.yaml', Yaml.stringify(mail))
      e.reply([`初始化成功~\n当前环境：${value}\nID：${scenes}\nGM状态：启用\n超级管理为：`, segment.at(e.user_id), `\n\n温馨提示：\n普通玩家仅可绑定一次UID\n管理员无上限\n\n设置管理员指令：\n(绑定管理|添加管理)`, segment.at(e.user_id), `\n\n仅超级管理可用~删除同理~`])
    }

  }

  async 关闭GM(e) {
    const config = Yaml.parse(fs.readFileSync(_path + '/config.yaml', 'utf8'))
    const { value, scenes } = await getScenes(e)
    const modeEnabled = config[scenes]?.mode

    if (modeEnabled === undefined) {
      e.reply(`此${value}还没有开启过GM哦`)
      return
    }

    if (modeEnabled === false) {
      e.reply(`GM在此${value}已经关闭，请不要重复关闭`)
      return
    }

    if (modeEnabled === true) {
      config[scenes].mode = false
      fs.writeFileSync(_path + '/config.yaml', Yaml.stringify(config))
      e.reply("GM当前状态：关闭")
    }
  }

  async 绑定管理员(e) {
    const config = Yaml.parse(fs.readFileSync(_path + '/config.yaml', 'utf8'))
    const { value, scenes } = await getScenes(e)
    const modeEnabled = config[scenes]?.mode
    const at = e.message.find(item => item.type === 'at').qq
    const admin = config[scenes].Administrator
    if (modeEnabled === undefined) {
      e.reply(`当前${value}还没开启过GM，请先启用！`)
      return
    }
    if (modeEnabled === false) {
      e.reply(`当前${value}已经关闭GM，执行失败！`)
      return
    }
    if (admin.includes(at)) {
      e.reply([segment.at(at), `已经是管理员了！`])
      return
    }
    admin.push(at)
    fs.writeFileSync(_path + '/config.yaml', Yaml.stringify(config))
    e.reply([`管理员`, segment.at(at), ` 绑定成功！`])
  }

  async 解绑管理员(e) {
    const config = Yaml.parse(fs.readFileSync(_path + '/config.yaml', 'utf8'))
    const { value, scenes } = await getScenes(e)

    const modeEnabled = config[scenes]?.mode
    const at = e.message.find(item => item.type === 'at').qq
    const admin = config[scenes]?.Administrator
    if (modeEnabled === undefined) {
      e.reply(`当前${value}还没开启过GM，请先启用！`)
      return
    }

    if (modeEnabled === false) {
      e.reply(`当前${value}已经关闭GM，执行失败！`)
      return
    }

    const index = admin.indexOf(at.toString())
    if (index !== -1) {
      admin.splice(index, 1)
      fs.writeFileSync(_path + '/config.yaml', Yaml.stringify(config))
      e.reply(`解绑管理员成功！`)
    } else {
      e.reply([segment.at(at), `还不是管理员！`])
    }
  }

  async 绑定UID(e) {
    const config = Yaml.parse(fs.readFileSync(_path + '/config.yaml', 'utf8'))
    const mail = Yaml.parse(fs.readFileSync(_path + '/full_server_mail.yaml', 'utf8'))
    const { scenes } = await getScenes(e)
    const { mode } = await getmode(e) || {}
    if (!mode) return
    console.log(scenes)
    if (mode === true) {
      const admin = config[scenes].Administrator
      const newmsg = e.msg.replace(/绑定|\s|\W/g, '').replace(/[^0-9]/g, '')
      const uid = config[scenes]?.uid || []

      let at = String(e.user_id)
      const newat = e.message.find(item => item.type === 'at')
      if (newat) {
        at = String(newat.qq)
      }

      if (admin.includes(e.user_id.toString())) {
        const newuid = uid.findIndex(item => at in item)
        if (newuid !== -1) {
          uid[newuid][at] = newmsg
        } else {
          uid.push({ [at]: newmsg })
        }
        config[scenes].uid = uid
        fs.writeFileSync(_path + '/config.yaml', Yaml.stringify(config), 'utf8')
        if (Array.isArray(mail[scenes]) && !mail[scenes].includes(newmsg)) {
          mail[scenes].push(newmsg)
          fs.writeFileSync(_path + '/full_server_mail.yaml', Yaml.stringify(mail))
        }
        e.reply([segment.at(at), `绑定成功\n您的UID为：${newmsg}`])
      } else {
        const newuid = uid.find(item => Object.keys(item).includes(String(e.user_id)))
        if (newuid) {
          e.reply([segment.at(e.user_id), `您当前存在绑定的UID ${newuid[e.user_id]} 请联系管理员`])
        } else {
          uid.push({ [e.user_id]: newmsg })
          config[scenes].uid = uid
          fs.writeFileSync(_path + '/config.yaml', Yaml.stringify(config), 'utf8')
          if (Array.isArray(mail[scenes]) && !mail[scenes].includes(newmsg)) {
            mail[scenes].push(newmsg)
            fs.writeFileSync(_path + '/full_server_mail.yaml', Yaml.stringify(mail))
          }
          e.reply([segment.at(e.user_id), `绑定成功\n您的UID为：${newmsg}`])
        }
      }
    }
  }

  async 服务器列表(e) {
    const server = Yaml.parse(fs.readFileSync(_path + '/server.yaml', 'utf8'))
    const config = Yaml.parse(fs.readFileSync(_path + '/config.yaml', 'utf8'))
    const { scenes } = await getScenes(e)
    const { mode } = await getmode(e) || {}
    if (!mode) return
    const servername = config[scenes]?.server.name + '-' + config[scenes]?.server.version
    if (mode === true) {
      const topkeys = Object.getOwnPropertyNames(server)
      topkeys.sort(function (a, b) {
        return server[a].order - server[b].order
      })

      let result = ""
      for (let i = 0; i < topkeys.length; i++) {
        const key = topkeys[i]
        const id = server[key].id
        result += `${i + 1}: ${key}`
        if (id === config[scenes]?.server.id) {
          result += " ✔️"
        }
        if (i < topkeys.length - 1) {
          result += "\n"
        }
      }
      e.reply([`当前服务器：${servername}\n通过【切换服务器+ID】进行切换\n当前服务器列表：\n`, result])
    }
  }

  async 切换服务器(e) {
    const server = Yaml.parse(fs.readFileSync(_path + '/server.yaml', 'utf8'))
    const config = Yaml.parse(fs.readFileSync(_path + '/config.yaml', 'utf8'))
    const { mode } = await getmode(e) || {}
    if (!mode) return
    const { scenes } = await getScenes(e)

    if (mode === true) {
      const serverId = e.msg.match(/\d+/)[0]
      let newserver

      Object.keys(server).forEach(key => {
        const item = server[key]
        if (item.id === serverId) {
          newserver = item
        }
      })

      if (newserver) {
        config[scenes].server = newserver
        fs.writeFileSync(_path + '/config.yaml', Yaml.stringify(config))
        const topkeys = Object.getOwnPropertyNames(server)
        topkeys.sort(function (a, b) {
          return server[a].order - server[b].order
        })

        let result = ""
        for (let i = 0; i < topkeys.length; i++) {
          const key = topkeys[i]
          const id = server[key].id
          result += `${i + 1}: ${key}`
          if (id === config[scenes]?.server.id) {
            result += " ✔️"
          }
          if (i < topkeys.length - 1) {
            result += "\n"
          }
        }
        const servername = config[scenes]?.server.name + '-' + config[scenes]?.server.version
        e.reply([`当前服务器：${servername}\n通过【切换服务器+ID】进行切换\n当前服务器列表：\n`, result])
      } else {
        e.reply('服务器ID输入错误')
      }
    }
  }


  async 全局拉黑(e) {
    const other = Yaml.parse(fs.readFileSync(_otherpath, 'utf8'))
    const at = Number(e.message.find(item => item.type === 'at').qq)

    if (other.blackQQ.includes(at)) {
      e.reply([segment.at(e.user_id), `玩家 `, segment.at(at), ` 已经被拉黑`])
    } else {
      other.blackQQ.push(at)
      const yamlString = Yaml.stringify(other)
      fs.writeFileSync(_otherpath, yamlString.replace(/-\s*"(\d+)"\s*/g, "- $1"), 'utf8')
      e.reply([segment.at(e.user_id), `拉黑玩家 `, segment.at(at), ` 成功`])
    }
  }

  async 解除拉黑(e) {
    const other = Yaml.parse(fs.readFileSync(_otherpath, 'utf8'))
    const at = e.message.find(item => item.type === 'at').qq

    const index = other.blackQQ.indexOf(Number(at))
    if (index === -1) {
      e.reply([segment.at(e.user_id), `玩家 `, segment.at(at), ` 没有被拉黑`])
    } else {
      other.blackQQ.splice(index, 1)
      const yamlString = Yaml.stringify(other)
      fs.writeFileSync(_otherpath, yamlString.replace(/-\s*"(\d+)"\s*/g, "- $1"), 'utf8')
      e.reply([segment.at(e.user_id), `玩家 `, segment.at(at), ` 已经解除拉黑`])
    }
  }

  async 插件更新(e) {
    const _path = process.cwd() + '/plugins/Zyy-GM-plugin/'
    if (!e.isMaster) {
      e.reply("分支错误")
      return true
    }

    let command = "git  pull"
    e.reply("GM插件更新中...")

    exec(command, { cwd: `${_path}` }, function (error, stdout) {
      if (/Already up[ -]to[ -]date/.test(stdout)) {
        e.reply("GM插件已经是最新版本...")
        return true
      }
      if (error) {
        e.reply(`更新失败了呜呜呜\nError code: ${error.code}\n等会再试试吧`)
        return true
      }
      e.reply("更新完成！请发送 #重启 或者手动重启吧~")
    })

    return true
  }
}
