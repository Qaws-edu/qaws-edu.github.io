/* Ms. Asmaa — reusable flat-style SVG poses for Qaws */
(function(){
const INK='#141414', SKIN='#FFAE8C', VEST='#DDE887', PINK='#FF9FC0';

function head(opts){
  opts=opts||{};
  const pupils = opts.pupilsUp
    ? '<circle cx="88" cy="80" r="4.5" fill="'+INK+'"/><circle cx="116" cy="80" r="4.5" fill="'+INK+'"/>'
    : '<circle cx="88" cy="87" r="4.5" fill="'+INK+'"/><circle cx="112" cy="87" r="4.5" fill="'+INK+'"/>';
  const brows = opts.pupilsUp
    ? '<path d="M78 64 Q86 60 94 64 M106 70 Q114 66 122 70" stroke="'+INK+'" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
    : '<path d="M78 68 Q86 64 94 68 M106 68 Q114 64 122 68" stroke="'+INK+'" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
  const mouth = opts.openSmile
    ? '<path d="M85 102 Q100 121 115 102 Q100 110 85 102 Z" fill="#8E3B3B" stroke="'+INK+'" stroke-width="3.5" stroke-linejoin="round"/>'
    : (opts.smallSmile
      ? '<path d="M90 106 Q100 111 110 105" fill="none" stroke="'+INK+'" stroke-width="4.5" stroke-linecap="round"/>'
      : '<path d="M87 104 Q100 117 113 104" fill="none" stroke="'+INK+'" stroke-width="4.5" stroke-linecap="round"/>');
  return '<path d="M58 152 C48 82 62 34 100 32 C138 34 152 82 142 152 C126 164 74 164 58 152 Z" fill="#FFFFFF" stroke="'+INK+'" stroke-width="4"/>'
    + '<ellipse cx="100" cy="86" rx="31" ry="36" fill="'+SKIN+'" stroke="'+INK+'" stroke-width="4"/>'
    + '<path d="M71 82 C73 56 84 45 100 45 C116 45 127 56 129 82" fill="none" stroke="'+INK+'" stroke-width="3.5"/>'
    + '<path d="M73 112 C80 128 120 128 127 112" fill="none" stroke="'+INK+'" stroke-width="3.5"/>'
    + '<circle cx="86" cy="84" r="11" fill="#fff" stroke="'+INK+'" stroke-width="3.5"/>'
    + '<circle cx="114" cy="84" r="11" fill="#fff" stroke="'+INK+'" stroke-width="3.5"/>'
    + pupils + brows + mouth
    + '<circle cx="73" cy="99" r="5" fill="'+PINK+'" opacity=".75"/><circle cx="127" cy="99" r="5" fill="'+PINK+'" opacity=".75"/>';
}

function torso(){
  return '<path d="M66 150 C58 195 56 230 60 264 L140 264 C144 230 142 195 134 150 Q100 162 66 150 Z" fill="#FFFFFF" stroke="'+INK+'" stroke-width="4"/>'
    + '<path d="M66 148 Q80 156 92 158 L92 196 Q76 194 68 182 Q62 164 66 148 Z" fill="'+VEST+'" stroke="'+INK+'" stroke-width="3.5"/>'
    + '<path d="M134 148 Q120 156 108 158 L108 196 Q124 194 132 182 Q138 164 134 148 Z" fill="'+VEST+'" stroke="'+INK+'" stroke-width="3.5"/>'
    + '<path d="M70 194 Q100 206 130 194 L138 230 Q100 246 62 230 Z" fill="'+VEST+'" stroke="'+INK+'" stroke-width="3.5"/>'
    + '<path d="M82 202 L78 226 M100 206 L100 234 M118 202 L122 226" stroke="'+INK+'" stroke-width="2.5" fill="none"/>'
    + '<path d="M100 238 L100 262" stroke="'+INK+'" stroke-width="2.5"/><circle cx="100" cy="250" r="3" fill="'+INK+'"/>';
}

function arm(path){ return '<path d="'+path+'" stroke="'+INK+'" stroke-width="26" stroke-linecap="round" fill="none"/>'
  + '<path d="'+path+'" stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" fill="none"/>'; }
function hand(x,y,r){ return '<circle cx="'+x+'" cy="'+y+'" r="'+(r||9)+'" fill="'+SKIN+'" stroke="'+INK+'" stroke-width="3.5"/>'; }
function fingers(x,y,flip){ const s=flip?-1:1;
  return '<path d="M'+(x-7*s)+' '+(y-10)+' L'+(x-10*s)+' '+(y-21)+' M'+x+' '+(y-12)+' L'+x+' '+(y-24)+' M'+(x+7*s)+' '+(y-10)+' L'+(x+11*s)+' '+(y-21)+'" stroke="'+INK+'" stroke-width="3" stroke-linecap="round"/>'; }

function svg(inner, vb){ return '<svg viewBox="'+(vb||'0 0 200 272')+'" xmlns="http://www.w3.org/2000/svg">'+inner+'</svg>'; }

const poses = {
  wave(){ return svg(
    torso()
    + arm('M70 156 L58 206') + hand(57,214,8.5)
    + arm('M130 156 L164 108') + hand(168,100,10) + fingers(168,100)
    + head()
    + '<path d="M30 60 l3 8 8 3 -8 3 -3 8 -3-8 -8-3 8-3z" fill="#fff" stroke="'+INK+'" stroke-width="2.5" stroke-linejoin="round"/>'
  ); },
  point(){ return svg(
    torso()
    + arm('M70 156 C54 176 58 196 74 202') + hand(78,202,8.5)
    + arm('M130 158 L184 138') + hand(188,136,9)
    + '<path d="M188 136 L199 131" stroke="'+INK+'" stroke-width="4" stroke-linecap="round"/>'
    + '<circle cx="182" cy="112" r="3.5" fill="#FF6F5E" stroke="'+INK+'" stroke-width="2.5"/><circle cx="192" cy="102" r="2.8" fill="#2B5BE4" stroke="'+INK+'" stroke-width="2.5"/>'
    + head()
  ); },
  cheer(){ return svg(
    torso()
    + arm('M70 156 L38 106') + hand(34,98,10) + fingers(34,98)
    + arm('M130 156 L162 106') + hand(166,98,10) + fingers(166,98)
    + head({openSmile:true})
    + '<path d="M170 40 l3 8 8 3 -8 3 -3 8 -3-8 -8-3 8-3z" fill="#FFD500" stroke="'+INK+'" stroke-width="2.5" stroke-linejoin="round"/>'
    + '<circle cx="26" cy="48" r="4" fill="#2B5BE4" stroke="'+INK+'" stroke-width="2.5"/>'
  ); },
  think(){ return svg(
    torso()
    + arm('M70 158 C58 184 74 196 96 196')
    + arm('M130 158 C146 178 138 148 122 132') + hand(118,128,9)
    + head({pupilsUp:true, smallSmile:true})
    + '<circle cx="158" cy="60" r="4" fill="#fff" stroke="'+INK+'" stroke-width="3"/>'
    + '<circle cx="170" cy="44" r="5.5" fill="#fff" stroke="'+INK+'" stroke-width="3"/>'
    + '<circle cx="184" cy="24" r="7.5" fill="#fff" stroke="'+INK+'" stroke-width="3"/>'
    + '<text x="184" y="29" text-anchor="middle" font-size="13" font-weight="800" fill="'+INK+'">؟</text>'
  ); },
  book(){ return svg(
    torso()
    + arm('M70 158 L88 202') + arm('M130 158 L112 202')
    + '<path d="M100 196 C88 188 68 188 58 194 L58 238 C68 232 88 232 100 240 C112 232 132 232 142 238 L142 194 C132 188 112 188 100 196 Z" fill="#FF6F5E" stroke="'+INK+'" stroke-width="4" stroke-linejoin="round"/>'
    + '<path d="M100 201 C90 194 74 194 66 199 L66 230 C74 226 90 226 100 232 C110 226 126 226 134 230 L134 199 C126 194 110 194 100 201 Z" fill="#FFFFFF" stroke="'+INK+'" stroke-width="3" stroke-linejoin="round"/>'
    + '<path d="M100 201 L100 232" stroke="'+INK+'" stroke-width="3"/>'
    + '<path d="M72 206 L92 206 M72 213 L92 213 M108 206 L128 206 M108 213 L128 213" stroke="'+INK+'" stroke-width="2.2" stroke-linecap="round"/>'
    + hand(70,222,8.5) + hand(130,222,8.5)
    + head()
  ); },
  bust(){ return svg(
    '<path d="M66 150 C58 195 56 230 60 264 L140 264 C144 230 142 195 134 150 Q100 162 66 150 Z" fill="#FFFFFF" stroke="'+INK+'" stroke-width="4"/>' + head()
  , '40 22 122 142'); }
};

window.Asmaa = {
  get(name){ return (poses[name]||poses.wave)(); },
  names: Object.keys(poses)
};
})();
