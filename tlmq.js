/*
 * Copyright 2023 tldb Author. All Rights Reserved.
 * email: donnie4w@gmail.com
 * https://githuc.com/donnie4w/tldb
 * https://githuc.com/donnie4w/tlmq-js
 */



const STAT = {
    MQ_AUTH: 1,
    MQ_PUBBYTE: 2,
    MQ_PUBJSON: 3,
    MQ_SUB: 4,
    MQ_PULLBYTE: 5,
    MQ_PULLJSON: 6,
    MQ_PING: 7,
    MQ_ERROR: 8,
    MQ_PUBMEM: 9,
    MQ_RECVACK: 10,
    // MQ_MERGE: 11,
    MQ_SUBCANCEL: 12,
    MQ_CURRENTID: 13,
    MQ_ACK: 0
}

class mqCli {
    PullByteHandler = null;
    PullJsonHandler = null;
    PubByteHandler = null;
    PubJsonHandler = null;
    PubMemHandler = null;
    AckHandler = null;
    ErrHandler = null;
    BeforeHandler = null;
    submap = new Map();
    pingNum = 1;
    constructor(addr, auth) {
        this.isclose = false;
        this.valid = true;
        this.url = addr + "/mq";
        this.origin = "http://tldb-mq";
        this.websocket = null;
        this.auth = auth;
    }
    connect() {
        if (this.url != "" && this.auth != "") {
            this.websocket = new WebSocket(this.url);
            let father = this;
            this.websocket.onopen = function (evt) {
                father.authmq(father.auth);
                father.isclose = false;
                father.pingNum = 0;
            };
            this.websocket.onclose = function (evt) {
                father.isclose = true;
            };
            this.websocket.onerror = function (evt, e) {
                father.isclose = true;
            };
            this.websocket.onmessage = function (evt) {
                if (evt.data instanceof Blob) {
                    var reader = new FileReader();
                    reader.readAsArrayBuffer(evt.data);
                    reader.onload = function () {
                        father.prase(this.result);
                    }
                }
            }
        }
    }

    close() {
        this.websocket.close();
    }

    send(type, bs) {
        const table = [];
        let ts = new Uint8Array([type]);
        let ids = intToByte(getAckId(), 4);
        table[0] = ts[0];
        for (let i = 1; i <= 4; i++) {
            table[i] = 0;
        }
        for (let i = 1; i <= 4; i++) {
            table[i + 4] = ids[i - 1];
        }
        if (!isEmpty(bs)) {
            let bss = encodeUTF8(bs)
            for (let i = 0; i < bss.length; i++) {
                table[9 + i] = bss[i]
            }
        }
        let arrayBuffer = new ArrayBuffer(table.length);
        var array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < table.length; i++) {
            array[i] = table[i];
        }
        this.websocket.send(array);
    }

    prase(data) {
        let type = new Uint8Array(data.slice(0, 1))[0];
        switch (type) {
            case STAT.MQ_ACK:
                break
            case STAT.MQ_AUTH:
                break;
            case STAT.MQ_ERROR:
                break;
            case STAT.MQ_PING:
                this.pingNum--;
                break;
            case STAT.MQ_PUBJSON:
                console.log("MQ_PUBJSON");
                const decoderpj = new TextDecoder('utf-8');
                const pjjson = decoderpj.decode(data.slice(1, data.byteLength));
                if (!isEmpty(this.PubJsonHandler)) {
                    this.PubJsonHandler(pjjson);
                }
                break;
            case STAT.MQ_PUBMEM:
                const decoderpm = new TextDecoder('utf-8');
                const pmjson = decoderpm.decode(data.slice(1, data.byteLength));
                console.log(pmjson);
                if (!isEmpty(this.PubMemHandler)) {
                    this.PubMemHandler(pmjson);
                }
                break;
            default:
        }
    }

    ping() {
        if (!isEmpty(this.websocket) && this.isclose && this.url != "" && this.auth != "" || this.pingNum > 5) {
            this.connect();
        } else if (!isEmpty(this.websocket)) {
            try {
                this.pingNum++;
                this.pingmg();
            } catch (err) {
                console.log(err);
            }
        }
    }

    authmq(auth) {
        this.send(STAT.MQ_AUTH, auth)
    }

    pingmg() {
        this.send(STAT.MQ_PING, null)
    }

    sub(topic) {
        this.submap[topic] = 0;
        this.send(STAT.MQ_SUB|0x80, topic);
    }

    pubJson(topic, msg) {
        this.send(STAT.MQ_PUBJSON, pubjson(topic, msg));
    }

    pubMem(topic, msg) {
        this.send(STAT.MQ_PUBMEM, pubjson(topic, msg));
    }

}


function isEmpty(obj) {
    if (typeof obj == "undefined" || obj == null || obj == "") {
        return true;
    } else {
        return false;
    }
}

var seq = 1;

function getAckId() {
    let b1 = new Float64Array([Date.now()]);
    let b2 = new Float64Array([seq++]);
    const table = [];
    for (let i = 0; i < b1.length + b2.length; i++) {
        if (i < b1.length) {
            table[i] = b1[i];
        } else {
            table[i] = b2[i];
        }
    }
    let id = crc32(table);
    return id;
}

function crc32(buf) {
    const IEEE = 0xedb88320
    const table = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            if ((c & 1) === 1) {
                c = IEEE ^ (c >>> 1);
            } else {
                c = c >>> 1;
            }
        }
        table[i] = c;
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (~crc >>> 0);
}

const intToByte = (number, length) => {
    let bytes = [];
    let i = 0;
    do {
        bytes[length - 1 - i++] = number & (255);
        number = number >> 8;
    } while (i < length)
    return bytes;
}

function encodeUTF8(str) {
    const codePoints = Array.from(str, c => c.codePointAt(0));
    const buffer = new ArrayBuffer(codePoints.length * 4);
    const uint8Array = new Uint8Array(buffer);
    let offset = 0;
    for (let i = 0; i < codePoints.length; i++) {
        const codePoint = codePoints[i];
        if (codePoint < 0x80) {
            uint8Array[offset++] = codePoint;
        } else if (codePoint < 0x800) {
            uint8Array[offset++] = 0xC0 | (codePoint >> 6);
            uint8Array[offset++] = 0x80 | (codePoint & 0x3F);
        } else if (codePoint < 0x10000) {
            uint8Array[offset++] = 0xE0 | (codePoint >> 12);
            uint8Array[offset++] = 0x80 | ((codePoint >> 6) & 0x3F);
            uint8Array[offset++] = 0x80 | (codePoint & 0x3F);
        } else {
            uint8Array[offset++] = 0xF0 | (codePoint >> 18);
            uint8Array[offset++] = 0x80 | ((codePoint >> 12) & 0x3F);
            uint8Array[offset++] = 0x80 | ((codePoint >> 6) & 0x3F);
            uint8Array[offset++] = 0x80 | (codePoint & 0x3F);
        }
    }
    return uint8Array.subarray(0, offset);
}

function pubjson(topic, msg) {
    return JSON.stringify({ "Topic": topic, "Msg": msg, "Id": 0 })
}

// var mc = new mqCli("ws://localhost:5100", "mymq=123");
// mc.PubJsonHandler = function (data) { console.log("pubjson data>>>" + data); };
// mc.PubMemHandler = function (data) { console.log("pubmem data>>>" + data); };
// mc.connect();
// setTimeout("mc.sub('111')", 4000);
// setTimeout("mc.pubJson('111','hello js pubjson')", 4000);
// setTimeout("mc.pubMem('111','hello js pubmem')", 4000);
// setInterval("mc.ping()", 4000);