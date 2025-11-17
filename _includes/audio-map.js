<script>
window.AUDIO_MAP = {
  {% assign parent_folders = site.static_files | where_exp:"f","f.path contains '/assets/audio/'" | map:"path" %}
  {% assign unique_parents = "" | split: "" %}

  {% for p in parent_folders %}
    {% assign parts = p | split:'/' %}
    {% assign parent = parts[3] %}
    {% unless unique_parents contains parent %}
      {% assign unique_parents = unique_parents | push: parent %}
    {% endunless %}
  {% endfor %}

  {% for parent in unique_parents %}
    "{{ parent }}": [
      {% assign files = site.static_files | where_exp:"f","f.path contains '/assets/audio/' | and f.path contains parent" %}
      {% for f in files %}
        "{{ f.basename }}"
        {% unless forloop.last %},{% endunless %}
      {% endfor %}
    ]
    {% unless forloop.last %},{% endunless %}
  {% endfor %}
};
window.ALL_PARENT_FOLDERS = {{ unique_parents | jsonify }};
</script>
