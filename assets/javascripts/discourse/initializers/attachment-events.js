import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "attachment-click-handler",

  initialize() {
    withPluginApi((api) => {
      
      // decorateCookedElement 会在每个 .cooked 容器渲染后执行
      api.decorateCookedElement((postElement) => {
        // postElement 是当前渲染的 HTML 容器
        // helper 可以获取当前帖子的相关信息 (如 helper.getModel() 获取 post 实例)

        // 查找该容器下所有的 attachment 链接
        const attachments = postElement.querySelectorAll("a.attachment");

        attachments.forEach((link) => {
          // 检查是否已经绑定过，防止重复绑定（Discourse 某些情况下会多次渲染）
          if (link.dataset.clickBound) {
            return;
          };

          link.addEventListener("click", (event) => {
            // 在这里编写你的逻辑
            this.handleAttachmentClick(event, link);
          });

          // 标记已绑定
          link.dataset.clickBound = "true";
        });
      });
    });
  },

  handleAttachmentClick(event, link) {
    // eslint-disable-next-line no-console
    console.log("附件被点击了！", link.href);

    // 如果你想阻止默认下载行为，可以：
    // event.preventDefault();

    // 示例：弹出一个提示
    // alert("你正在下载: " + link.innerText);
    
    // 或者发送埋点数据到后端
  },
};
