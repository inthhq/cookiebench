const container = document.querySelector("#related-stories");
const filter = document.querySelector("#reading-topic");
const status = document.querySelector("#reading-status");
if (container && filter && status) {
  try {
    const response = await fetch("/page-assets/reading-list.json");
    if (!response.ok) {
      throw new Error(`Reading list request failed: ${response.status}`);
    }
    const stories = await response.json();
    const render = () => {
      const selected = stories
        .filter(
          (story) => filter.value === "All" || story.topic === filter.value
        )
        .toSorted(
          (left, right) =>
            left.minutes - right.minutes || left.id.localeCompare(right.id)
        )
        .slice(0, 6);
      const items = selected.map((story) => {
        const item = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = story.title;
        const details = document.createElement("p");
        details.textContent = `${story.description} ${story.minutes} minute read.`;
        item.append(title, details);
        return item;
      });
      container.replaceChildren(...items);
      status.textContent = `${selected.length} stories from a collection of ${stories.length}`;
    };
    filter.addEventListener("change", render);
    render();
    document.documentElement.dataset.readingListReady = "true";
  } catch (error) {
    status.textContent = "Reading list unavailable";
    console.error(error);
  }
}
