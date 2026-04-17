// filter.js - 修复版
Page({
  data: {
    totalScore: 0,
    type: '',
    typeName: '',
    subjects: ['物理', '化学', '生物', '历史', '地理', '政治'],
    regions: ['北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'],
    selectedSubjects: [],
    selectedRegions: [],
    schoolKeyword: '',
    majorKeyword: ''
  },

  onLoad: function() {
    var app = getApp();
    if (app.globalData && app.globalData.studentScore) {
      this.setData({
        totalScore: app.globalData.studentScore.total,
        type: app.globalData.selectedType,
        typeName: app.globalData.selectedType === 'benke' ? '本科' : '专科'
      });
    }
  },

  isSubjectSelected: function(item) {
    return this.data.selectedSubjects.indexOf(item) >= 0;
  },

  isRegionSelected: function(item) {
    return this.data.selectedRegions.indexOf(item) >= 0;
  },

  onSubjectTap: function(e) {
    var value = e.currentTarget.dataset.value;
    var selectedSubjects = this.data.selectedSubjects;
    var index = selectedSubjects.indexOf(value);
    if (index >= 0) {
      selectedSubjects.splice(index, 1);
    } else {
      selectedSubjects.push(value);
    }
    this.setData({ selectedSubjects: selectedSubjects });
  },

  onRegionTap: function(e) {
    var value = e.currentTarget.dataset.value;
    var selectedRegions = this.data.selectedRegions;
    var index = selectedRegions.indexOf(value);
    if (index >= 0) {
      selectedRegions.splice(index, 1);
    } else {
      selectedRegions.push(value);
    }
    this.setData({ selectedRegions: selectedRegions });
  },

  onSchoolInput: function(e) {
    this.setData({ schoolKeyword: e.detail.value });
  },

  onMajorInput: function(e) {
    this.setData({ majorKeyword: e.detail.value });
  },

  onBack: function() {
    wx.navigateBack();
  },

  onSearch: function() {
    var type = this.data.type;
    var selectedSubjects = this.data.selectedSubjects;
    var selectedRegions = this.data.selectedRegions;
    var schoolKeyword = this.data.schoolKeyword;
    var majorKeyword = this.data.majorKeyword;
    var totalScore = this.data.totalScore;

    // 合并关键词：学校名+专业名
    var keyword = schoolKeyword || majorKeyword || '';

    var queryParams = {
      type: type,
      keyword: keyword,
      province: selectedRegions.length > 0 ? selectedRegions[0] : '',
      category: selectedSubjects.length > 0 ? selectedSubjects[0] : '', // 修复：添加category参数
      minScore: totalScore - 50,
      maxScore: totalScore + 30,
      predictedScore: totalScore,
      page: 1,
      pageSize: 100
    };

    var app = getApp();
    app.globalData = app.globalData || {};
    app.globalData.queryParams = queryParams;
    app.globalData.filterConditions = {
      selectedSubjects: selectedSubjects,
      selectedRegions: selectedRegions,
      schoolKeyword: schoolKeyword,
      majorKeyword: majorKeyword
    };

    wx.navigateTo({
      url: '/pages/result/result'
    });
  }
});
