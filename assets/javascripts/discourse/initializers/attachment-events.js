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

        // 查找该容器下所有的 a 链接，并过滤出附件是'.tar.gz' 的链接
        const attachments = Array.from(postElement.querySelectorAll("a")).filter(link => {
          // TODO 增加准确的下载地址判断
          return String(link?.href).endsWith(".tar.gz") && String(link.innerText || link.innerHTML).endsWith('.tar.gz');
        });

        attachments.forEach((link) => {
          // 检查是否已经绑定过，防止重复绑定（Discourse 某些情况下会多次渲染）
          if (link.dataset.clickBound) {
            return;
          };
          link.addEventListener("click", (event) => {
            const currentUserName = post?.get('currentUser')?.username || api.getCurrentUser()?.username;
            // eslint-disable-next-line no-console
            console.log('类别名称', post?.topic?.category?.name, currentUserName)
            if (currentUserName) {
              // 如果有用户名，才阻止原生事件，未登录用户跳过
              event.preventDefault();
              event.stopPropagation();
            }
            this.handleAttachmentClick(event, post, link, link.innerText || link.innerHTML, api);
          });

          // 标记已绑定
          link.dataset.clickBound = "true";
        });
      });
    });
  },

  handleAttachmentClick(event, post, link, linkText, api) {
    try {
      // 或者发送埋点数据到后端
      if (String(link?.href).endsWith(".gz") && String(linkText).endsWith('.tar.gz')) {
        // 获取社区名称、话题名称、用户名、附件名称
        const currentUserName = post?.get('currentUser')?.username || api.getCurrentUser()?.username;
        if (!currentUserName) {
          return;
        }
        // eslint-disable-next-line no-console
        console.log('下载 handle')
        this.handleCustomDownload(event, post, link, linkText, api);
        return;
      }
    } catch {
      // 无返回值处理

      return;
    }
  },
  handleCustomDownload(event, post, link, linkText, api) {
    // 获取社区名称、话题名称、用户名、附件名称
    const topicTitle = post?.get('topic')?.title;
    const fileName = linkText;
    const currentUserName = post?.get('currentUser')?.username || api.getCurrentUser()?.username;
    if (!currentUserName) {
      return;
    }
    // eslint-disable-next-line no-console
    console.log('执行自定义下载逻辑', currentUserName);
    // 非阻塞埋点
    try {
      // POST 下载：动态创建form并提交，浏览器自动弹窗下载
      const form = document.createElement('form');
      form.style.display = 'none';
      form.method = 'POST';
      form.action = 'https://databuff.com/officeApi/saasLens/downloadAttachment'; // 请根据实际接口调整
      form.target = '_blank';
      // 传递所有参数
      const params = {
        communityName: post?.topic?.category?.name || 'Default',
        topicName: topicTitle,
        userName: currentUserName,
        attachmentName: fileName,
      };
      Object.entries(params).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('下载失败', e?.message || e);
    }
    
  }
};
