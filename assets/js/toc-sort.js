document.addEventListener("DOMContentLoaded", function () {
  const radioButtons = document.querySelectorAll("input[name='tocSort']");
  const tocDefault = document.getElementById("toc-default");
  const tocAtoZ = document.getElementById("toc-atoz");

  radioButtons.forEach(rb => {
    rb.addEventListener("change", function () {
      if (this.value === "atoz") {
        tocDefault.style.display = "none";
        tocAtoZ.style.display = "block";
      } else {
        tocDefault.style.display = "block";
        tocAtoZ.style.display = "none";
      }
    });
  });
});