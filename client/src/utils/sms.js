// How many SMS parts a message costs: 160 characters in one part, 153 per part after that.
// Any character outside the basic set (an emoji, for example) drops the limits to 70 and 67.
const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€";

export function smsInfo(text = "") {
  const chars = [...String(text)];
  let septets = 0;
  let gsm = true;
  for (const c of chars) {
    if (GSM_BASIC.includes(c)) septets += 1;
    else if (GSM_EXT.includes(c)) septets += 2;
    else { gsm = false; break; }
  }
  const length = gsm ? septets : chars.length;
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  return { length, segments: length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / multi), unicode: !gsm };
}
