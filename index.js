
const puncStart = new Set(" ,.'\"（《【“‘「『");
const puncEnd = new Set(" ,.'\"）》】”’」』");

/**
 * 忽略一切CommonMark规范，让marked能正确加粗下面示例中的字符串，它们经常出现在中文LLM的回复中
 * - 这就是**“我得到吨”**与商业**“比比拉布”**的典型差异。
 * - 这就是*开源“我得到吨”*与**商业“比比拉布”**的典型差异。
 * @param {any=} options
 */
export function markedBetterChinesePunc(options) {
	return {extensions: [{
			name: 'betterChinesePunc',
			level: 'inline',
			start(src) { return src.match(/([*_])\1?/)?.index; },
			tokenizer(src, tokens) {
				let part, index = 0;

				let validStart = puncStart.has(src[index]);
				if (validStart) index++; // always true because regexp
				else if (index === 0) validStart = true;

				part = src[index];
				if (part !== "*" && part !== "_") return;
				//if (part === "_" && !validStart) return;

				const modeChar = part;
				let symCount = 0;
				while (src[index] === part) {
					symCount++;
					index++;
				}

				let validStart2 = puncStart.has(src[index]);

				function skip() {
					return {
						skip: true,
						type: ["betterChinesePunc"],
						raw: src.substring(0, index),
						tokens: []
					};
				}

				let contentStart = index;
				while ((src[index] ?? modeChar) !== modeChar) index++;
				let contentEnd = index;

				for (let i = 0; i < symCount; i++) {
					if (src[index + i] !== modeChar) return skip();
				}
				index += symCount;

				const validEnd = puncEnd.has(src[contentEnd-1]) || puncEnd.has(src[index]);
				if (part === "_"
					? !(validStart || validStart2) || (!validEnd || !src[index])
					: !validStart && !validStart2 && !validEnd && src[index]
				)
					return skip();

				if (symCount > 2) symCount = symCount & 1 ? 0 : 2;
				const token = {
					type: ["betterChinesePunc", "em", "strong"][symCount],
					raw: src.substring(0, index),
					text: src.substring(contentStart, contentEnd),
					tokens: []
				};
				this.lexer.inline(token.text, token.tokens);
				return token;
			},
			renderer(token) {
				if (token.skip) return token.raw;
				if (!token.text) return "";
				return `<strong><em>${this.parser.parseInline(token.tokens)}</em></strong>`;
			}
		}]};
}

const possibleStart = /[\s\p{P}]/u;
const latexRule =  /^(\${1,2})\n?((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\n?\1(?=[\s\p{P}]|$)/u;

let katex;

export function markedBetterKaTeX(options = {throwOnError: false}) {
	return {extensions: [{
			name: 'betterKaTeX',
			level: 'inline',
			start(src) {
				let index = 0;
				while (true) {
					index = src.indexOf('$', index);
					if (index === -1) return;

					if (index === 0 || possibleStart.test(src[index - 1])) {
						// 跳过前面不是换行的$$
						if (index !== 0 && src[index - 1] !== "\n" && src[index + 1] === "$") {

						} else {
							const formulaCandidate = src.substring(index);
							if (formulaCandidate.match(latexRule)) return index;
						}
					}

					index += 2;
				}
			},
			tokenizer(src, tokens) {
				const match = src.match(latexRule);
				if (match) {
					return {
						type: 'betterKaTeX',
						raw: match[0],
						text: match[2].trim(),
						displayMode: src[1] === "$",
					};
				}
			},
			renderer(token) {
				if (katex != null) return katex(token, options);

				const htmlId = 'k-'+Math.random().toString(36);
				import('katex').then(k => {
					katex = (token, options) => {
						const {text, raw, displayMode} = token;
						try {
							return k.renderToString(text, { ...options, displayMode });
						} catch (e) {
							// not official, you can manually add style
							return `<span class='katex-error' title="${e.message.replaceAll('"', '&quot;')}">${raw}</span>`;
						}
					}

					const el = document.getElementById(htmlId);
					if (el) el.outerHTML = katex(token, options);
				});
				return `<span id='${htmlId}'>${token.text}</span>`;
			},
		}]};
}