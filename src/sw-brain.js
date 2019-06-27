self.addEventListener('install', function(event) {
  // Perform install steps, if necessary
});

self.addEventListener('fetch', function(event) {
  let url = new URL(event.request.url);
  let pathname = url.pathname;
  let script_name = pathname.substring(pathname.lastIndexOf('/')+1);
  let dot = script_name.indexOf('.');

  if (dot !== -1) {
    if (script_name.substr(dot + 1) === 'bf') {
      return event.respondWith(getBrain(event.request, url));
    }
  }

  return fetch(event.request);
});


// This code comes from:
//   <insert URL here when it's discovered!>

var bf = function(source, input) {
	var output = [];
	var input_cur = 0;
	var source_cur = 0;
	var prev_source_cur = -1;
	var data = new Array(30000);
	var data_cur = 0;
	var pointers = [];
	var search = 0;

	data[0] = 0;

	reader: while ( source_cur < source.length ) {
		var chunk = source[source_cur];

		if ( search > 0 ) {
			switch ( chunk ) {
				case '[':
					search++;
					break;
				case ']':
					if ( search > 0 ) {
						search--;
					}
					break;
			}

			source_cur++;
			continue reader;
		}

		switch ( chunk ) {
			case '+':
				data[data_cur]++;
				break
			case '-':
				if ( data[data_cur] > 0 ) {
					data[data_cur]--;
				}
				break;
			case '>':
				data_cur++;
				if ( data[data_cur] == null ) {
					data[data_cur] = 0;
				}
				break;
			case '<':
				if ( data_cur > 0 ) {
					data_cur--;
				}
				break;
			case ',':
				data[data_cur] = input[input_cur] || -1;
				input_cur++;
				break;
			case '.':
				output.push(data[data_cur]);
				break;
			case '[':
				if ( data[data_cur] != 0 ) {
					pointers.push(source_cur);
				}
				else if ( prev_source_cur > -1 ) {
					source_cur = prev_source_cur;
					prev_source_cur = -1;
				}
				else {
					search = 1;
				}
				break;
			case ']':
				//prev_source_cur = source_cur;
				source_cur = pointers.pop();
				continue reader;
				break;
		}

		source_cur++;
	}

	return output;
};

var interface = function(source, input) {
	var a_source = source.replace(/[^\[\].,><+-]/g, '').split('');
	var a_input = !input ? [] : input.split('').map(function(char) {
		return char.charCodeAt(0);
	}).filter(function(cc) {
		return cc > 0 && cc < 256;
	});

	return bf(a_source, a_input);
};


//
// This is fairly standard service worker code
//
async function getBrain(request, url) {
  let original = await fetch(request.url);
  original = await original.text();
  original = original.trim();

  const urlParams = url.searchParams;
  const input = urlParams.get('input') || '';
  const outputAs = urlParams.get('output') || 'alert';

  let output = interface(original, input); // results in an array
  output = String.fromCharCode.apply(null, output);
  output = output.trim(); // make it suitable for an alert box
  output = JSON.stringify(output).slice(1, -1);

  let jsCode = '';
  switch(outputAs) {
    case 'document':
      jsCode = "document.write('" + output + "')";
      break;
    default:
      jsCode = "alert('" + output + "')";
  }

  const enc = new TextEncoder();
  const u8array = enc.encode(jsCode);

  let js = new Blob([u8array.buffer], {type: 'text/javascript'});

  return new Response(js);
}
