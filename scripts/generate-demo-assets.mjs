// Original SVG illustrations, generated locally without stock photo dependencies.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const catalogue = JSON.parse(
  readFileSync(new URL("../data/catalogue.json", import.meta.url), "utf8"),
);
const folder = new URL("../frontend/public/images/demo/", import.meta.url);
mkdirSync(folder, { recursive: true });
const shapes = {
  brush:
    '<g transform="rotate(30 300 270)"><rect x="275" y="135" width="50" height="270" rx="24" fill="#c89e69"/><rect x="270" y="115" width="60" height="95" rx="25" fill="#e5c89d"/><path d="M280 130v60m10-60v60m10-60v60m10-60v60m10-60v60" stroke="#fbf7ee" stroke-width="6"/></g>',
  soap: '<rect x="165" y="190" width="270" height="155" rx="65" fill="#e8c9a4" transform="rotate(-12 300 270)"/><rect x="230" y="225" width="140" height="85" rx="35" fill="#f2dfc5" transform="rotate(-12 300 270)"/><path d="M280 270q15-30 50-20-10 35-50 20" fill="#769773"/>',
  pads: '<ellipse cx="270" cy="280" rx="95" ry="80" fill="#d7b98d"/><ellipse cx="320" cy="245" rx="95" ry="80" fill="#f7f1e3"/><ellipse cx="350" cy="295" rx="95" ry="80" fill="#e9e2d1"/><ellipse cx="350" cy="295" rx="75" ry="60" fill="none" stroke="#d0c4a8" stroke-width="3" stroke-dasharray="4 6"/>',
  straws:
    '<g fill="none" stroke-linecap="round"><path d="M240 370V150" stroke="#9baba8" stroke-width="20"/><path d="M300 370V200q0-45 60-60" stroke="#bdc9c2" stroke-width="20"/><path d="M345 370V230q0-35 50-45" stroke="#819790" stroke-width="18"/><path d="M210 380h190" stroke="#4a6757" stroke-width="8"/></g>',
  wrap: '<path d="m175 180 210-20 55 190-230 20z" fill="#d3b276"/><path d="m155 215 205-35 50 190-225 20z" fill="#f4e6bd"/><g fill="#73956c"><path d="M215 250q0-40 40-35 0 40-40 35m60 65q0-40 40-35 0 40-40 35m35-75q0-40 40-35 0 40-40 35"/></g>',
  bag: '<path d="M200 210h200l25 185H175z" fill="#e4d3b2"/><path d="M240 225v-50a60 60 0 0 1 120 0v50" fill="none" stroke="#a78358" stroke-width="18"/><path d="M275 290q20-50 70-35-10 55-70 35" fill="#6d9060"/><path d="m277 315 55-45" stroke="#456644" stroke-width="4"/>',
  bottle:
    '<rect x="248" y="125" width="104" height="45" rx="12" fill="#c7a777"/><rect x="235" y="160" width="130" height="235" rx="42" fill="#5f8268"/><rect x="248" y="180" width="20" height="185" rx="10" fill="#8aa58d"/><path d="M292 260q15-30 40-20-6 32-40 20" fill="#dfebcf"/>',
  cup: '<path d="M210 195h180l-25 195H235z" fill="#bc9d83"/><path d="M225 240h150l-10 85H235z" fill="#6e9179"/><rect x="200" y="175" width="200" height="30" rx="12" fill="#ddc8a5"/><path d="m325 185 20-80" stroke="#94b5ad" stroke-width="14" stroke-linecap="round"/>',
  candle:
    '<rect x="210" y="220" width="180" height="165" rx="26" fill="#c19f76"/><ellipse cx="300" cy="220" rx="90" ry="25" fill="#f4e3bf"/><rect x="245" y="268" width="110" height="65" rx="4" fill="#f2ebda"/><path d="M300 200q-45-30 0-70 35 40 0 70" fill="#e8b257"/><path d="M300 217v-20" stroke="#694c33" stroke-width="5"/>',
  tray: '<rect x="145" y="200" width="310" height="160" rx="35" fill="#b68c58" transform="rotate(-12 300 270)"/><rect x="163" y="214" width="274" height="126" rx="28" fill="#e0c394" transform="rotate(-12 300 270)"/><path d="m210 230 180-35m-175 75 185-35m-175 75 185-35" stroke="#c5a575" stroke-width="3"/>',
  box: '<rect x="160" y="215" width="280" height="155" rx="35" fill="#a6b7ae"/><rect x="155" y="190" width="290" height="75" rx="30" fill="#cad5ce"/><rect x="180" y="205" width="240" height="40" rx="16" fill="#5f7b65"/><rect x="140" y="245" width="40" height="60" rx="8" fill="#7b8e82"/><rect x="420" y="245" width="40" height="60" rx="8" fill="#7b8e82"/>',
  cutlery:
    '<g fill="#c8a16a"><rect x="200" y="160" width="14" height="230" rx="7"/><rect x="227" y="160" width="14" height="230" rx="7"/><rect x="290" y="225" width="18" height="165" rx="9"/><ellipse cx="299" cy="195" rx="35" ry="55"/><rect x="365" y="210" width="18" height="180" rx="9"/><path d="M344 145h12v65h12v-65h12v65h12v-65h12v80h-60z"/></g>',
};
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
for (const [index, product] of catalogue.products.entries()) {
  const bg = ["#f2eee4", "#e9efe6", "#ede8e1"][index % 3];
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520" role="img"><title>' +
    escape(product.name) +
    '</title><rect width="600" height="520" rx="32" fill="' +
    bg +
    '"/><circle cx="310" cy="255" r="170" fill="#ffffff" opacity=".45"/><ellipse cx="300" cy="410" rx="145" ry="18" fill="#1b3e2a" opacity=".09"/>' +
    shapes[product.illustration] +
    '<text x="40" y="56" font-family="sans-serif" font-size="15" letter-spacing="4" fill="#526b4c">ECOSTORE / EVERYDAY REUSABLES</text><text x="40" y="480" font-family="sans-serif" font-size="15" letter-spacing="2" fill="#526b4c">LESS WASTE. MORE LIFE.</text></svg>';
  writeFileSync(new URL(product.slug + ".svg", folder), svg + "\n");
}
const imageFolder = new URL("../frontend/public/images/", import.meta.url);
writeFileSync(
  new URL("product-placeholder.svg", imageFolder),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520"><rect width="600" height="520" fill="#eef3e8"/><path d="M210 310q-20-180 180-160 20 160-180 160" fill="#94ad7e"/><path d="m210 360 135-155" stroke="#496340" stroke-width="10" fill="none"/><text x="300" y="440" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#496340">EcoStore</text></svg>\n',
);
writeFileSync(
  new URL("hero.svg", imageFolder),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 850"><defs><linearGradient id="g"><stop stop-color="#203c30"/><stop offset="1" stop-color="#8fa985"/></linearGradient></defs><rect width="1600" height="850" fill="url(#g)"/><circle cx="1280" cy="200" r="250" fill="#e4dabc" opacity=".25"/><path d="M0 700Q450 400 1000 690t600-100v260H0" fill="#bdcba0" opacity=".25"/><g transform="translate(880 165) scale(1.1)">' +
    shapes.bag +
    '</g><g transform="translate(1200 250) scale(.95)">' +
    shapes.bottle +
    '</g><path d="M1000 650q-80-300-20-530M980 470q-170-100-110-190 140 30 110 190m0-180q50-170 145-140-5 120-145 140" fill="#b1c68d" stroke="#b1c68d" stroke-width="7" opacity=".65"/></svg>\n',
);
console.log(
  "Generated " +
    catalogue.products.length +
    " product illustrations, hero and placeholder.",
);
