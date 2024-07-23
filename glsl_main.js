/*

lowp: 8-bit fixed-point
mediump: 16-bit fixed-point
highp: 24-bit fixed-point

*/

const vertexShaderCode = `#version 300 es

// in vec2 a_position;
in ivec2 a_position;
// in vec2 a_offset;
// in float a_size;
in uint a_attrs;
in vec4 a_color;

in uint a_polygon_start_index;
in uint a_polygon_length;

// out (attrs and color)
out vec4 o_color;
flat out uint o_attrs;

flat out uint o_polygon_start_index;
flat out uint o_polygon_length;

uniform vec2 u_winres;

void main(void) {
  vec2 half_winres = u_winres / 2.0;

  vec2 a_position_ = vec2(a_position) / half_winres;
  gl_Position = vec4(a_position_, 0.0, 1.0);

  o_color = a_color;
  o_attrs = a_attrs;

  o_polygon_start_index = a_polygon_start_index;
  o_polygon_length = a_polygon_length;
}`;

// Create and compile the fragment shader
const fragmentShaderCode = `#version 300 es
precision mediump float; // Specify default precision for floats
// isampler2d precision


// in (attrs and color)
in vec4 o_color;
flat in uint o_attrs;

flat in uint o_polygon_start_index;
flat in uint o_polygon_length;

out vec4 outColor;

uniform mediump isampler2D u_vertex_sampler;
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

// prepare an array of vertices (length: o_polygon_length)
ivec2 vertices[255];

const uint INSIDE_POLYGON = 1u;
const uint ON_OUTLINE = 2u;
const uint OUTSIDE_POLYGON = 3u;

// positive & ccw: outside 
// negative & ccw: inside
// positive & cw: inside
// negative & cw: outside

float distance_impl(vec2 a, vec2 b) {
  return sqrt(pow(a.x - b.x, 2.) + pow(a.y - b.y, 2.));
}

uint isOnOutline(vec2 uv, uint polygon_length) {
  bool inside = false;

  for (uint i = 0u; i < polygon_length; i++) {
    vec2 vertex = vec2(vertices[i]);
    vec2 next_vertex = vec2(vertices[(i + 1u) % polygon_length]);

    vec2 edge = next_vertex - vertex;
    vec2 edgeDir = normalize(edge);
    vec2 normal = normalize(vec2(edge.y, -edge.x));

    vec2 to_vertex = uv - vertex;
    float distance = dot(normal, to_vertex);

    float projection = dot(to_vertex, edgeDir);
    bool isOnSegment = projection >= 0.0 && projection <= length(edge);


    if (abs(distance) <= u_outline_size) {
      if (
          isOnSegment 
          || distance_impl(uv, vertex) <= u_outline_size 
          || distance_impl(uv, next_vertex) <= u_outline_size
        ) {
        return ON_OUTLINE;
      }
    }

    bool edgeCrossesRay = (vertex.y > uv.y) != (next_vertex.y > uv.y);
    if (edgeCrossesRay) {
      float slope = (next_vertex.x - vertex.x) / (next_vertex.y - vertex.y);
      float xAtY = vertex.x + slope * (uv.y - vertex.y);
      if (uv.x < xAtY) {
        inside = !inside;
      }
    }
  }
  return inside? INSIDE_POLYGON : OUTSIDE_POLYGON;
}

vec4 lerpColor(vec4 a, vec4 b, float t) {
  return a + (b - a) * t;
}

void main(void) {
  // retrieve all the vertices from the tex
  for (uint i = 0u; i < o_polygon_length; i++) {
    vertices[i] = texture(u_vertex_sampler, getTexCoord(o_polygon_start_index + i)).xy + ivec2(u_winres_frag / 2.0);
  }

  vec2 fragCoord = gl_FragCoord.xy;

  uint fragmentLocation = isOnOutline(fragCoord, o_polygon_length);

  switch (fragmentLocation) {
    case INSIDE_POLYGON:
      outColor = o_color;
      return;
    case ON_OUTLINE:
      outColor = lerpColor(o_color, vec4(0.0, 0.0, 0.0, 1.0), 0.5);
      return;
    case OUTSIDE_POLYGON:
      discard;
      return;
  }

  outColor = o_color;
}`;

export { vertexShaderCode, fragmentShaderCode };