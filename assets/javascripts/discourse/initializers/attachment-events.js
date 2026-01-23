import { withPluginApi } from "discourse/lib/plugin-api";

export default {
  name: "attachment-click-handler",

  initialize() {
    withPluginApi((api) => {
      
      // decorateCookedElement 会在每个 .cooked 容器渲染后执行
      api.decorateCookedElement((postElement, helper) => {
        // postElement 是当前渲染的 HTML 容器
        // helper 可以获取当前帖子的相关信息 (如 helper.getModel() 获取 post 实例)
        const post = helper.getModel() || {};
        //// eslint-disable-next-line no-console
        // console.log("处理帖子 ID:", post?.get('currentUser')?.username, post?.get('topic')?.title);

        // 查找该容器下所有的 attachment 链接
        const attachments = postElement.querySelectorAll("a.attachment");

        attachments.forEach((link) => {
          // 检查是否已经绑定过，防止重复绑定（Discourse 某些情况下会多次渲染）
          if (link.dataset.clickBound) {
            return;
          };

          link.addEventListener("click", (event) => {
            // 在这里编写你的逻辑
            this.handleAttachmentClick(event, post, link, link.innerText || link.innerHTML);
          });

          // 标记已绑定
          link.dataset.clickBound = "true";
        });
      });
    });
  },

  handleAttachmentClick(event, post, link, linkText) {

    // 如果你想阻止默认下载行为，可以：
    // event.preventDefault();
    
    // 或者发送埋点数据到后端
    if (String(link?.href).endsWith(".gz") && String(linkText).endsWith('.tar.gz')) {
      // 获取社区名称、话题名称、用户名、附件名称
      const topicTitle = post?.get('topic')?.title;
      const fileName = linkText;
      const currentUserName = post?.get('currentUser')?.username;
      fetch('https://databuff.com:19090/api/saasLens/recordAttachmentDownload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          credentials: 'same-origin',
        },
        body: JSON.stringify({
          communityName: 'DataLens',
          topicName: topicTitle,
          userName: currentUserName,
          attachmentName: fileName,
        }),
      }).catch(() => {
        //// eslint-disable-next-line no-console
        // console.error('Error recording attachment download:', error);
        // 无返回值处理
      });
      return;
    }
  },
};
