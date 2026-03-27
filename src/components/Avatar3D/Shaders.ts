export const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uIntensity;

  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

  float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0); 
    vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vPosition = position;
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    float noise = snoise(vec3(position * 2.5 + uTime * 0.8));
    vec3 newPosition = position + normal * noise * uIntensity;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

export const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uState; 
  uniform vec3 uMouse;
  uniform float uIsUserPresent;
  uniform float uVoiceColor;

  void main() {
    float fresnel = pow(1.2 - dot(vNormal, vec3(0, 0, 1.0)), 2.5);
    
    vec3 baseColor;
    vec3 glowColor;

    if (uVoiceColor < 0.2) {
      baseColor = vec3(0.9, 0.0, 0.1);
      glowColor = vec3(1.0, 0.1, 0.2);
    } else if (uVoiceColor < 0.5) {
      baseColor = vec3(0.0, 0.8, 0.4);
      glowColor = vec3(0.2, 1.0, 0.6);
    } else {
      baseColor = vec3(0.2, 0.4, 1.0);
      glowColor = vec3(0.4, 0.6, 1.0);
    }

    if (uState > 0.5) {
      vec3 purple = vec3(0.4, 0.0, 0.8); 
      vec3 pinkRed = vec3(1.0, 0.1, 0.4); 
      
      float colorFlow = 0.5 + 0.5 * sin(uTime * 2.0);
      baseColor = mix(purple, pinkRed, colorFlow);
      glowColor = pinkRed;
    }

    vec3 delta = vWorldPosition - uMouse;
    float distSq = dot(delta, delta);
    float touchRadiusSq = 0.64; 
    float touchEffect = (1.0 - smoothstep(0.0, touchRadiusSq, distSq)) * uIsUserPresent;
    
    vec3 touchColor = vec3(0.0, 1.0, 1.0);
    vec3 mixedColor = mix(baseColor, glowColor, fresnel * 0.6);
    vec3 finalColor = mix(mixedColor, touchColor, touchEffect * 0.8);
    
    gl_FragColor = vec4(finalColor + touchColor * touchEffect * 0.2, 1.0);
  }
`;

export const epicenterVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const epicenterFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uIntensity;

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float distSq = dot(vUv - center, vUv - center);
    
    float frequency = 60.0;
    float speed = 4.0;     
    
    float wave = sin(sqrt(distSq) * frequency - uTime * speed);
    float slope = cos(sqrt(distSq) * frequency - uTime * speed);
    
    float falloff = smoothstep(0.25, 0.0025, distSq); 
    
    float bump = wave * slope * falloff * uIntensity;
    
    vec3 surfaceColor = vec3(1.0, 1.0, 1.0);
    vec3 shadowColor = vec3(0.85, 0.85, 0.9); 
    
    vec3 finalColor = mix(surfaceColor, shadowColor, clamp(bump * 3.0, 0.0, 1.0));
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;