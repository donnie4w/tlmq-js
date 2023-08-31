### mq client for tldb in javascript

------------

See the example at  http://tlnet.top/tlmq

```javascript
//实例化
 var mc = new mqCli("ws://localhost:5100", "mymq=123");
 //实现接收订阅信息的方法
 mc.PubJsonHandler = function (data) { console.log("pubjson data>>>" + data); };
//实现接收订阅信息的方法
 mc.PubMemHandler = function (data) { console.log("pubmem data>>>" + data); };
 //连接服务器
 mc.connect();
 //订阅topic
mc.sub('111');
//发布topic
mc.pubJson('111','hello js pubjson');
 //发布topic，内存模式
 mc.pubMem('111','hello js pubmem');
//循环调用ping函数，间隔4秒
setInterval("mc.ping()", 4000);
```

