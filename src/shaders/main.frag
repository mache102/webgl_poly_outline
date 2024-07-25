#version 330 core

// in (attrs and color)
// in vec4 o_color;
flat in uint o_attrs;

flat in uint o_polygon_start_index;
flat in uint o_polygon_length;

out vec4 fragColor;

uniform isampler2D u_vertex_sampler;
uniform vec2 u_vertex_sampler_size;
uniform vec2 u_winres_frag;
uniform float u_outline_size;
uniform bool u_render_bounding_boxes;

// normalize the texCoord
vec2 normalizeTexCoord(vec2 texCoord) {
  return texCoord / u_vertex_sampler_size;
}

// get the texCoord
vec2 getTexCoord(uint index) {
  return normalizeTexCoord(vec2(
    mod(float(index), u_vertex_sampler_size.x),
    floor(float(index) / u_vertex_sampler_size.x)
  ));
}

// prepare an array of v (length: o_polygon_length)
vec2 v[255];

const uint INSIDE_POLYGON = 1u;
const uint ON_OUTLINE = 2u;
const uint OUTSIDE_POLYGON = 3u;
const vec4 INNER_COLOR = vec4(0.65, 0.85, 1.0, 1.0);
const vec4 OUTLINE_COLOR = vec4(0.0, 0.0, 0.0, 1.0);
float smoothness = 1.5;

// positive & ccw: outside 
// negative & ccw: inside
// positive & cw: inside
// negative & cw: outside

float distance_impl(vec2 a, vec2 b) {
  return sqrt(pow(a.x - b.x, 2.) + pow(a.y - b.y, 2.));
}

float sdPolygon(vec2 p, int length)
{
    float d = dot(p-v[0],p-v[0]);
    float s = 1.0;
    for( int i=0, j=length-1; i<length; j=i, i++ )
    {
        vec2 e = v[j] - v[i];
        vec2 w =    p - v[i];
        vec2 b = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );
        d = min( d, dot(b,b) );
        bvec3 c = bvec3(p.y>=v[i].y,p.y<v[j].y,e.x*w.y>e.y*w.x);
        if( all(c) || all(not(c)) ) s*=-1.0;  
    }
    return s*sqrt(d);
}

vec4 lerpColor(vec4 a, vec4 b, float t) {
  return a + (b - a) * t;
}

void main(void) {
 
  // retrieve all the v from the tex
  for (uint i = 0u; i < o_polygon_length; i++) {
    v[i] = vec2(texture(u_vertex_sampler, getTexCoord(o_polygon_start_index + i + 2u)).xy) + vec2(u_winres_frag / 2.0);
  }
  vec2 center = vec2(texture(u_vertex_sampler, getTexCoord(o_polygon_start_index)).xy) + vec2(u_winres_frag / 2.0);
  float radius = texture(u_vertex_sampler, getTexCoord(o_polygon_start_index + 1u)).x;

  // v[0] = vec2(500., 500.);
  // v[1] = vec2(600., 500.);
  // v[2] = vec2(600., 600.);
  // v[3] = vec2(500., 600.);
  // v[4] = vec2(450., 550.);

  vec2 fragCoord = gl_FragCoord.xy;

  if (distance(fragCoord, center) < radius) {
    fragColor = INNER_COLOR;
    return;
  }

  float d = sdPolygon(fragCoord, int(o_polygon_length));

  if (d > 0.) {
    fragColor = OUTLINE_COLOR;
  } else {
    fragColor = INNER_COLOR;
  }

  // float b1 = max(0., u_outline_size - smoothness);
  // float b2 = u_outline_size + smoothness;
  // float a1 = -u_outline_size - smoothness;
  // float a2 = min(0., u_outline_size + smoothness);

  // if (d > 0.) {
  //   float s = smoothstep(b1, b2, d);
  //   // mix from outline color to transparent
  //   fragColor = lerpColor(OUTLINE_COLOR, vec4(0.), s);
  // } else {
    
  //   float s = smoothstep(a1, a2, d);
  //   // mix from inner color to outline
  //   fragColor = lerpColor(INNER_COLOR, OUTLINE_COLOR, s);
  
  // }
}