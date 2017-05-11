var events = require('events');
var http = require('http');
var https = require('https');
var mimelib = require('mimelib');

module.exports.sse = sse;

function sse (u) {
	var s = new SSE();
	var client = (u.protocol === 'https:' ? https : http).get(u, function (res) {
		if (res.statusCode === 200) {
			if (res.headers['content-type'] === undefined) {
				throw new Error('undefined content type.');
			}
			if (mimelib.parseHeaderLine(res.headers['content-type']).defaultValue !== 'text/event-stream') {
				throw new Error('not text/event-stream.');
			}
			res.setEncoding('utf-8');
			res.on('data', function (chunk) {
				s.data(chunk);
			});
			res.on('error', function (err) {
				throw err;
			});
		}
		else {
			throw new Error(http.STATUS_CODES[res.statusCode]);
		}
	});
	client.on('error', function (err) {
		throw err;
	});
	return s;
}

class SSE extends events.EventEmitter {
	constructor () {
		super();
		this.state = {
			first_char: true, 
			line: '', 
			event: '', 
			data: '', 
			id: '', 
			retry: 5000
		};
	}
	data (chunk) {
		var events = parse_sse_chunk(chunk, this.state);
		for (var i = 0; i < events.length; i++) {
			this.emit(events[i].event, events[i].data);
		}
	}
}

function parse_sse_chunk (chunk, state) {
	var events = [];
	for (var i = 0; i < chunk.length; i++) {
		if (i === 0 && state.first_char) {
			state.first_char = false;
			if (chunk.charCodeAt(0) === 0xFEFF) {
				continue;
			}
		}
		if (chunk[i] === '\r') {
			if (i + 1 < chunk.length && chunk[i + 1] === '\n') {
				i++;
			}
			var event = parse_sse_line(state);
			if (event !== null) {
				events.push(event);
			}
			state.line = '';
		}
		else if (chunk[i] === '\n') {
			var event = parse_sse_line(state);
			if (event !== null) {
				events.push(event);
			}
			state.line = '';
		}
		else {
			state.line += chunk[i];
		}
	}
	return events;
}

function parse_sse_line (state) {
	if (state.line.startsWith(':')) {
	}
	else if (state.line.startsWith('event:')) {
		if (state.line.length > 6 && state.line[6] === ' ') {
			state.event = state.line.substring(7);
		}
		else {
			state.event = state.line.substring(6);
		}
	}
	else if (state.line === 'event') {
		state.event = '';
	}
	else if (state.line.startsWith('data:')) {
		if (state.line.length > 5 && state.line[5] === ' ') {
			state.data += state.line.substring(6) + '\n';
		}
		else {
			state.data += state.line.substring(5) + '\n';
		}
	}
	else if (state.line === 'data') {
	}
	else if (state.line.startsWith('id:')) {
		if (state.line.length > 3 && state.line[3] === ' ') {
			state.id = state.line.substring(4);
		}
		else {
			state.id = state.line.substring(3);
		}
	}
	else if (state.line === 'id') {
		state.id = '';
	}
	else if (state.line.startsWith('retry:')) {
		var retry = NaN;
		if (state.line.length > 6 && state.line[6] === ' ') {
			retry = parseInt(state.line.substring(7));
		}
		else {
			retry = parseInt(state.line.substring(6));
		}
		if (!isNaN(retry)) {
			state.retry = retry;
		}
	}
	else if (state.line === 'retry') {
	}
	else if (state.line === '') {
		var event = null;
		if (state.data !== '') {
			if (state.event === '') {
				state.event = 'message';
			}
			state.data = state.data.substring(0, state.data.length - 1);
			event = {
				event: state.event, 
				data: state.data
			};
		}
		state.event = '';
		state.data = '';
		return event;
	}
	else {
	}
	return null;
}