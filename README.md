# akarin

receive server sent event from url

## example

mastodon

```
var akarin = require('akarin');

var sse = akarin.sse({
	protocol: 'https:', 
	hostname: 'streaming.mstdn.jp', 
	path: '/api/v1/streaming/user', 
	headers: {
		'Authorization': 'Bearer ****************************************************************'
	}
});
sse.on('update', function (data) {
	console.log(data);
});
```
