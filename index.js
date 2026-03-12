
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
			start(src) {  return src.match(/([*_])\1?/)?.index; },
			tokenizer(src, tokens) {
				const rule = /^(([*_])\2?)([^*]+)\1/;
				const match = rule.exec(src);
				if (match) {
					const token = {
						type: match[1].length === 1 ? "em" : "strong",
						raw: match[0],
						text: match[3].trim(),
						tokens: []
					};
					this.lexer.inline(token.text, token.tokens);
					return token;
				}
			},
			renderer(token) {
				const x = token.type;
				return `<${x}>${this.parser.parseInline(token.tokens)}</${x}>`;
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