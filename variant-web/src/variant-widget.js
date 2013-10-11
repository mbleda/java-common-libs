function VariantWidget(args) {
    var _this = this;
    _.extend(this, Backbone.Events);

    this.id = Utils.genId("VariantWidget");

    //set default args
    this.border = true;
    this.autoRender = false;
    this.targetId;
    this.width;
    this.height;

    //set instantiation args, must be last
    _.extend(this, args);

    this.rendered = false;
    if (this.autoRender) {
        this.render();
    }
}

VariantWidget.prototype = {
    render: function (targetId) {
        var _this = this;
        this.targetId = (targetId) ? targetId : this.targetId;

        this.dbName = this.job.command.data['vcf-file'];
        this.dbName = this.dbName.substring(this.dbName.lastIndexOf('/') + 1);
        this.dbName = this.dbName.substring(0, this.dbName.lastIndexOf('.')) + '.db';
        this.statsName = this.dbName.substring(0, this.dbName.lastIndexOf('.')) + '.json';

        this.rendered = true;
    },
    draw: function () {
        var _this = this;

        /* main panel */
        this.panel = this._createPanel(this.targetId);


        this.optValues = Ext.create('Ext.data.Store', {
            fields: ['value', 'name'],
            data: [
                {"value": "<", "name": "<"},
                {"value": "<=", "name": "<="},
                {"value": ">", "name": ">"},
                {"value": ">=", "name": ">="},
                {"value": "=", "name": "="},
                {"value": "!=", "name": "!="}
            ],
            pageSize: 20
        });

        /* form */

        this.form = this._createForm();
        this.grid = this._createGrid();


        //this._addColorPicker();

        this.gridEffect = this._createEffectGrid();
        this.panelGV = this._createGenomeViewer();

        this.panel.insert(0, this.form);

        this.tabPanel = this._createTabPanel();
        this.tabPanel.add(this.gridEffect);
        this.tabPanel.add(this.panelGV);

        Ext.getCmp(this.id + 'rightpanel').add(this.grid);
        Ext.getCmp(this.id + 'rightpanel').add(this.tabPanel);
        this.tabPanel.setActiveTab(0);

        this.grid.getSelectionModel().on('selectionchange', function (sm, selectedRecord) {

            if (selectedRecord.length) {

                var row = selectedRecord[0].data;
                var chr = row.chromosome;
                var pos = row.position;
                var ref = row.ref;
                var alt = row.alt;

                var db_name = _this.form.getForm().getValues()['db_name'];

                var formParams = {};

                formParams['db_name'] = db_name;
                formParams['chr'] = chr;
                formParams['pos'] = pos;
                formParams['ref'] = ref;
                formParams['alt'] = alt;

                var url = "http://aaleman:8080/variant/rest/effect";
                console.log(url);


                _this.gridEffect.setLoading(true);
                CellBaseManager.get({
                    host: 'http://ws.bioinfo.cipf.es/cellbase/rest',
                    version: 'latest',
                    species: 'hsa', //TODO multiples species
                    category: 'genomic',
                    subCategory: 'variant',
                    query: chr + ':' + pos + ':' + ref + ':' + alt,
                    resource: 'consequence_type',
                    success: function (response, textStatus, jqXHR) {
                        console.log(response);
                        if (response.length > 0) {
                            _this.gridEffect.getStore().loadData(response);
                            var region = new Region({
                                chromosome: chr,
                                start: pos,
                                end: pos
                            });
                            console.log(region);
                            if (!_.isUndefined(_this.gv)) {
                                _this.gv.setRegion(region);
                            }
                        } else {
                            _this.gridEffect.getStore().removeAll();
                        }
                        _this.gridEffect.setLoading(false);
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        console.log('Error loading Effect');
                        _this.gridEffect.setLoading(false);

                    }
                });

            }
        });

        // Analysis info
        _this._updateInfo();


    },
    _createTabPanel: function () {
        var tabPanel = Ext.create('Ext.tab.Panel', {
            title: 'Additional Info',
            width: '100%',
            flex: 1,
            titleCollapse: true,
            collapsible: true,
            items: []
        });
        return tabPanel;
    },
    _updateInfo: function () {
        var _this = this;


        _this.form.setLoading(true);

        if (_this.sampleNames != null) {

            _this.grid.getStore().removeAll();
            _this.gridEffect.getStore().removeAll();

            for (var i = 0; i < _this.sampleNames.length; i++) {
                _this._removeSampleColumn(_this.sampleNames[i]);
            }

            _this.grid.reconfigure(null, _this.columnsGrid);
        }

        _this.sampleNames = [];

        OpencgaManager.poll({
            accountId: $.cookie("bioinfo_account"),
            sessionId: $.cookie("bioinfo_sid"),
            filename: this.statsName,
            jobId: this.job.id,
            success: function (data, textStatus, jqXHR) {
                var response = JSON.parse(data);
                console.log(response);
                var fcItems = [];
                for (var i in response.samples) {
                    var sName = response.samples[i];

                    _this.sampleNames.push(sName);

                    _this._addSampleColumn(sName);

                    var fc = {
                        xtype: 'fieldcontainer',
                        fieldLabel: sName,
                        items: [
                            {
                                xtype: 'checkboxgroup',
                                columns: 3,
                                items: [
                                    {
                                        boxLabel: '0/0',
                                        name: "sampleGT_" + sName,
                                        // checked:true,
                                        inputValue: '0/0'
                                    },
                                    {
                                        boxLabel: '0/1',
                                        name: "sampleGT_" + sName,
                                        // checked:true,
                                        inputValue: '0/1,1/0'
                                    },
                                    {
                                        boxLabel: '1/1',
                                        name: "sampleGT_" + sName,
                                        // checked:true,
                                        inputValue: '1/1'
                                    }
                                ]

                            }
                        ]
                    };


                    fcItems.push(fc);
                }

                _this.grid.reconfigure(null, _this.columnsGrid);

                var ctForm = Ext.getCmp("conseq_type_panel");
                ctForm.removeAll();
                ctForm.add(_this._createDynCombobox("conseq_type", "Consequence Type", response.consequenceTypes, "non_synonymous_codon"));
//
                var biotypeForm = Ext.getCmp("biotype_panel");
                biotypeForm.removeAll();
                biotypeForm.add(_this._createDynCombobox("biotype", "Btiotype", response.biotypes, null));
//
                var samples = Ext.getCmp("samples_form_panel");
                samples.removeAll();
                samples.add(fcItems);

                _this.form.setLoading(false);

            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log('WEB SERVICE ERROR: info');
                _this.form.setLoading(false);
            }
        });


    },
    _addSampleColumn: function (sampleName) {

        var _this = this;

        for (var i = 0; i < _this.attributes.length; i++) {
            if (_this.attributes[i].name == sampleName) {
                return false;
            }
        }

        _this.attributes.push({
            "name": sampleName,
            "type": "string"
        });

        for (var i = 0; i < _this.columnsGrid.length; i++) {
            var col = _this.columnsGrid[i];

            if (col['text'] == "Samples") {
                col["columns"].push({
                    "text": sampleName,
                    "dataIndex": sampleName,
                    "flex": 1,
                    "sortable": true
                });
            }
        }
        _this.model.setFields(_this.attributes);
    },
    _removeSampleColumn: function (sampleName) {

        var _this = this;
        for (var i = 0; i < _this.attributes.length; i++) {
            if (_this.attributes[i].name == sampleName) {
                _this.attributes.splice(i, 1);
                _this.model.setFields(_this.attributes);
            }
        }

        for (var i = 0; i < _this.columnsGrid.length; i++) {
            var col = _this.columnsGrid[i];
            if (col['text'] == "Samples") {
                var colSamples = col["columns"];
                for (var j = 0; j < colSamples.length; j++) {
                    if (colSamples[j].text == sampleName) {
                        colSamples.splice(j, 1);
                    }
                }
            }
        }
    },
    _createPanel: function (targetId) {
        var panel = Ext.create('Ext.panel.Panel', {
            title: 'widget',
            width: '100%',
            height: '100%',
            border: 0,
            layout: 'hbox',
            closable: true,
            cls: 'ocb-border-top-lightgrey',
            tbar: {items: [
                {text: '<span style="color:red">Summary</span>', handler: function () {
                    //TODO
                    alert("summary")
                }}
            ]},
            items: [
                {
                    id: this.id + 'rightpanel',
                    flex: 4,
                    height: '98%',
                    xtype: 'panel',
                    layout: 'vbox'
                }
            ]
        });
        targetId.add(panel);
        targetId.setActiveTab(panel);
        return panel;
    },
    _createGenomeViewer: function (targetId) {
        var _this = this;
        var genomeViewer;

        var panel = Ext.create('Ext.panel.Panel', {
            title: 'Genome Viewer',
            flex: 0.3,
            width: '100%',
            border: 0,
            html: "<div id='genomeViewer' style='width:800px;height:100%;position:relative;'></div>",
            titleCollapse: true,
            collapsible: true,
            listeners: {
                afterRender: function () {

                    var w = this.getWidth();
                    $("#genomeViewer").width(w);
                    console.log($("genomeViewer").width());

                    var region = new Region({
                        chromosome: "13",
                        start: 32889611,
                        end: 32889611
                    });

                    genomeViewer = new GenomeViewer({
                        sidePanel: false,
                        targetId: "genomeViewer",
                        autoRender: true,
                        border: true,
                        resizable: true,
                        region: region,
                        trackListTitle: '',
                        drawNavigationBar: false,
                        drawKaryotypePanel: false,
                        drawChromosomePanel: false,
                        drawRegionOverviewPanel: false
                    }); //the div must exist

                    genomeViewer.draw();

                    this.sequence = new SequenceTrack({
                        targetId: null,
                        id: 1,
                        title: 'Sequence',
                        histogramZoom: 20,
                        transcriptZoom: 50,
                        height: 30,
                        visibleRange: {
                            start: 99,
                            end: 100
                        },
                        featureTypes: FEATURE_TYPES,

                        renderer: new SequenceRenderer(),

                        dataAdapter: new SequenceAdapter({
                            category: "genomic",
                            subCategory: "region",
                            resource: "sequence",
                            species: genomeViewer.species,
                            featureCache: {
                                gzip: true,
                                chunkSize: 1000
                            }
                        })
                    });


                    this.gene = new GeneTrack({
                        targetId: null,
                        id: 2,
                        title: 'Gene',
                        histogramZoom: 20,
                        transcriptZoom: 50,
                        height: 140,
                        visibleRange: {
                            start: 0,
                            end: 100
                        },
                        featureTypes: FEATURE_TYPES,

                        renderer: new GeneRenderer(),

                        dataAdapter: new CellBaseAdapter({
                            category: "genomic",
                            subCategory: "region",
                            resource: "gene",
                            species: genomeViewer.species,
                            featureCache: {
                                gzip: true,
                                chunkSize: 50000
                            },
                            filters: {},
                            options: {},
                            featureConfig: FEATURE_CONFIG.gene
                        })
                    });

                    this.snp = new FeatureTrack({
                        targetId: null,
                        id: 4,
                        title: 'SNP',
                        histogramZoom: 70,
                        labelZoom: 80,
                        height: 100,
                        visibleRange: {
                            start: 0,
                            end: 100
                        },
                        featureTypes: FEATURE_TYPES,

                        renderer: new FeatureRenderer('snp'),

                        dataAdapter: new CellBaseAdapter({
                            category: "genomic",
                            subCategory: "region",
                            resource: "snp",
                            params: {
                                exclude: 'transcriptVariations,xrefs,samples'
                            },
                            species: genomeViewer.species,
                            featureCache: {
                                gzip: true,
                                chunkSize: 10000
                            },
                            filters: {},
                            options: {},
                            featureConfig: FEATURE_CONFIG.snp
                        })
                    });


                    genomeViewer.addTrack(this.sequence);
                    genomeViewer.addTrack(this.gene);
                    genomeViewer.addTrack(this.snp);

                    _this.gv = genomeViewer;
                }
            }
        });


        return panel;

    },
    _createForm: function () {
        var _this = this;

        var accordion = Ext.create('Ext.form.Panel', {
            border: false,
            flex: 1,
            height: "100%",
            title: "Filters",
            width: "100%",
            layout: {
                type: 'accordion',
                fill: false
            }
        });

        var regionItems = [
            //  this._getSelectDataPanel(),
            this._getChrStartEnd(),
            this._getRegionList(),
            this._getGenes(),
            this._getBioTypes()
        ];

        var region = Ext.create('Ext.panel.Panel', {
            title: "Region",
            items: regionItems
        });

        var statsItems = [
            this._getMAF(),
            this._getMissing(),
            this._getMendelError(),
            this._getIsIndel(),
            this._getInheritance()
        ];

        var stats = Ext.create('Ext.panel.Panel', {
            title: "Stats",
            items: statsItems
        });

        var samplesInfo = [];

        var samples = Ext.create('Ext.panel.Panel', {
            title: 'Samples',
            items: samplesInfo,
            id: "samples_form_panel"
        });

        var controlsItems = [
            this._getControls()
        ];

        var controls = Ext.create('Ext.panel.Panel', {
            title: "Controls",
            items: controlsItems
        });

        var effectItems = [
            this._getConsequenceType()
        ];

        var effect = Ext.create('Ext.panel.Panel', {
            title: "Effect",
            items: effectItems
        });

        var searchItems = [
            {
                xtype: 'button',
                text: 'Search',
                padding: 10,
                handler: function () {
                    _this._getResult();
                }
            }
        ];

        var search = Ext.create('Ext.panel.Panel', {
            title: "Search",
            items: searchItems

        });

        accordion.add(region);
        accordion.add(stats);
        accordion.add(samples);
        accordion.add(controls);
        accordion.add(effect);
        accordion.add(search);

        return accordion;
    },
    _createEffectGrid: function () {

        var groupingFeature = Ext.create('Ext.grid.feature.Grouping', {
            groupHeaderTpl: '{groupField}: {groupValue} ({rows.length} Item{[values.rows.length > 1 ? "s" : ""]})'
        });
        this.stEffect = Ext.create("Ext.data.Store", {
            groupField: 'featureId',
            fields: [
                {name: "featureId", type: "String"},
                {name: "featureName", type: "String"},
                {name: "featureType", type: "String"},
                {name: "featureBiotype", type: "String"},
                {name: "featureChromosome", type: "String"},
                {name: "featureStart", type: "int"},
                {name: "featureEnd", type: "int"},
                {name: "featureStrand", type: "String"},
                {name: "snpId", type: "String"},
                {name: "ancestral", type: "String"},
                {name: "alternative", type: "String"},
                {name: "geneId", type: "String"},
                {name: "transcriptId", type: "String"},
                {name: "geneName", type: "String"},
                {name: "consequenceType", type: "String"},
                {name: "consequenceTypeObo", type: "String"},
                {name: "consequenceTypeDesc", type: "String"},
                {name: "consequenceTypeType", type: "String"},
                {name: "aaPosition", type: "int"},
                {name: "aminoacidChange", type: "String"},
                {name: "codonChange", type: "String"}
            ],
            data: [],
            autoLoad: false,
            proxy: {type: 'memory'},
            pageSize: 5
        });

        var gridEffect = Ext.create('Ext.grid.Panel', {
            title: "Effect",
            flex: 0.3,
            width: '100%',
            store: this.stEffect,
            loadMask: true,
            border: 0,
            titleCollapse: true,
            collapsible: true,
            columns: [
                {xtype: 'rownumberer'},
                {
                    text: "Position chr:start:end (strand)",
                    dataIndex: "featureChromosome",
                    xtype: "templatecolumn",
                    tpl: "{featureChromosome}:{featureStart}-{featureEnd} ({featureStrand})",
                    flex: 1
                },
                {
                    text: "snp Id",
                    dataIndex: "snpId",
                    flex: 1
                },
                {
                    text: "Samples",
                    flex: 1
                },
                {
                    text: "Consequence Type",
                    dataIndex: "consequenceType",
                    xtype: "templatecolumn",
                    tpl: '{consequenceTypeObo} (<a href="http://www.sequenceontology.org/browser/current_svn/term/{consequenceType}" target="_blank">{consequenceType}</a>)',
                    flex: 1
                },
                {
                    text: "Aminoacid Change",
                    xtype: "templatecolumn",
                    tpl: "{aminoacidChange} - {codonChange} ({aaPosition})",
                    flex: 1
                },
                {
                    text: "gene (EnsemblId)",
                    dataIndex: "geneName",
                    xtype: 'templatecolumn',
                    tpl: '{geneName} (<a href="http://www.ensembl.org/Homo_sapiens/Location/View?g={geneId}" target="_blank">{geneId}</a>)',
                    flex: 1
                },
                {
                    text: "transcript Id",
                    dataIndex: "transcriptId",
                    xtype: 'templatecolumn',
                    tpl: '<a href="http://www.ensembl.org/Homo_sapiens/Location/View?t={transcriptId}" target="_blank">{transcriptId}</a>',
                    flex: 1
                },
                {
                    text: "feature Id",
                    dataIndex: "featureId",
                    flex: 1

                },
                {
                    text: "feature Name",
                    dataIndex: "featureName",
                    flex: 1

                },
                {
                    text: "feature Type",
                    dataIndex: "featureType",
                    flex: 1

                },
                {
                    text: "feature Biotype",
                    dataIndex: "featureBiotype",
                    flex: 1

                },
                {
                    text: "ancestral",
                    dataIndex: "ancestral",
                    hidden: true,
                    flex: 1
                },
                {
                    text: "alternative",
                    dataIndex: "alternative",
                    hidden: true,
                    flex: 1
                }
            ],
            features: [groupingFeature]
        });
        return gridEffect
    },
    _createGrid: function () {

        var _this = this;
        _this.columnsGrid = [
//            new Ext.grid.RowNumberer({width: 30}),
            {
                text: "Variant",
                dataIndex: 'chromosome',
                flex: 1,
                xtype: "templatecolumn",
                tpl: "{chromosome}:{position}"
            },
            {
                text: "Alleles",
                flex: 0.5,
                xtype: "templatecolumn",
                tpl: "{ref}>{alt}"
            },
            {
                text: 'Samples',
                flex: 1,
                columns: []
            },
            {
                text: "SNP id",
                dataIndex: 'stats_id_snp.',
                flex: 1,
                sortable: true
            },
            {
                flex: 1,
                text: "Controls (MAF)",
                columns: [
                    {
                        text: "1000G",
                        renderer: function (val, meta, record) {
                            if (record.data.controls["1000G"]) {

                                return record.data.controls["1000G"].maf + " (" + record.data.controls["1000G"].allele + ")";
                            } else {
                                return ".";
                            }
                        }
                    },
                    {
                        text: "BIER",
                        renderer: function (val, meta, record) {
                            if (record.data.controls["BIER"]) {

                                return record.data.controls["BIER"].maf + " (" + record.data.controls["BIER"].allele + ")";
                            } else {
                                return ".";
                            }
                        }
                    },
                    {
                        text: 'ESP'
                    }
                ]
            },
            {
                text: "Gene",
                dataIndex: 'gene_name',
                hidden: true,
                flex: 1
            },
            {
                text: "Consq. Type",
                dataIndex: "ct",
                flex: 1,
                sortable: true
            },
            {text: 'Polyphen', flex: 1},
            {text: 'Sift', flex: 1},
            {text: 'Conservation', flex: 1},
            {
                text: "Alleles & Genotypes",
                hidden: true,
                columns: [
                    {

                        text: "Allele Ref",
                        dataIndex: 'ref',
                        flex: 0.2,
                        hidden: true,
                        sortable: true
                    },
                    {
                        text: "Allele Alt",
                        dataIndex: 'alt',
                        flex: 0.2,
                        hidden: true,
                        sortable: true
                    },

                    {
                        text: "MAF",
                        dataIndex: 'stats_maf',
                        xtype: "templatecolumn",
                        tpl: "{stats_maf} ({stats_allele_maf})",
                        flex: 0.2,
                        hidden: true,
                        sortable: true
                    },
                    {
                        text: "MGF",
                        dataIndex: 'stats_mgf',
                        xtype: "templatecolumn",
                        tpl: "{stats_mgf} ({stats_genotype_maf})",
                        flex: 0.2,
                        hidden: true,
                        sortable: true
                    }
                ]
            },
            {
                text: "Missing Alleles/Genotypes",
                hidden: true,
                columns: [
                    {
                        text: "Miss. Alleles",
                        dataIndex: 'stats_miss_allele',
                        flex: 0.1,
                        hidden: true,
                        sortable: true
                    },
                    {
                        text: "Miss. Genotypes",
                        dataIndex: 'stats_miss_gt',
                        flex: 0.1,
                        hidden: true,
                        sortable: true
                    }
                ]
            },
            {
                text: "Mendelian Errors",
                flex: 1,
                dataIndex: 'stats_mendel_err',
                sortable: true,
                hidden: true
            },
            {
                text: "Is indel?",
                flex: 1,
                xtype: 'booleancolumn',
                trueText: 'Yes',
                falseText: 'No',
                dataIndex: 'stats_is_indel',
                sortable: true,
                hidden: true
            },
            {
                text: "Inheritance",
                flex: 1,
                hidden: true,
                columns: [
                    {
                        text: "% Cases dominant",
                        dataIndex: 'stats_cases_percent_dominant',
                        hidden: true,
                        renderer: function (value) {
                            return value.toFixed(2);
                        },
                        sortable: true
                    },
                    {
                        text: "% Controls dominant",
                        dataIndex: 'stats_controls_percent_dominant',
                        hidden: true,
                        renderer: function (value) {
                            return value.toFixed(2) + "%";
                        },
                        sortable: true
                    },
                    {
                        text: "% Cases recessive",
                        dataIndex: 'stats_cases_percent_recessive',
                        hidden: true,
                        renderer: function (value) {
                            return value.toFixed(2) + "%";
                        },
                        sortable: true
                    },
                    {
                        text: "% Controls recessive",
                        dataIndex: 'stats_controls_percent_recessive',
                        hidden: true,
                        renderer: function (value) {
                            return value.toFixed(2) + "%";
                        },
                        sortable: true
                    }
                ]
            }
        ];
        _this.attributes = [
            {name: "chromosome", type: "String"},
            {name: "position", type: "int"},
            {name: "alt", type: "String"},
            {name: "ref", type: "String"},
            {name: 'stats_id_snp', type: 'string'},
            {name: 'stats_maf', type: 'float'},
            {name: 'stats_mgf', type: 'double'},
            {name: 'stats_allele_maf', type: 'string'},
            {name: 'stats_genotype_maf', type: 'string'},
            {name: 'stats_miss_allele', type: 'int'},
            {name: 'stats_miss_gt', type: 'int'},
            {name: 'stats_mendel_err', type: 'int'},
            {name: 'stats_is_indel', type: 'boolean'},
            {name: 'stats_cases_percent_dominant', type: 'double'},
            {name: 'stats_controls_percent_dominant', type: 'double'},
            {name: 'stats_cases_percent_recessive', type: 'double'},
            {name: 'stats_controls_percent_recessive', type: 'double'},
            {name: 'gene_name', type: 'string'},
            {name: 'ct', type: 'string'},
            {name: "genotypes", type: 'auto'},
            {name: "effect", type: 'auto'},
            {name: "controls", type: 'auto'}
        ];
        _this.model = Ext.define('Variant', {
            extend: 'Ext.data.Model',
            fields: _this.attributes
        });
        _this.st = Ext.create('Ext.data.Store', {
            model: _this.model,
            groupField: 'gene_name',
            data: [],
            autoLoad: false,
            proxy: {type: 'memory'},
            pageSize: 5

        });
        var groupingFeature = Ext.create('Ext.grid.feature.Grouping', {
            groupHeaderTpl: '{groupField}: {groupValue} ({rows.length} Item{[values.rows.length > 1 ? "s" : ""]})',
            enableGroupingMenu: false
        });
        var grid = Ext.create('Ext.grid.Panel', {
                title: "Variant Info",
                flex: 1,
                width: '100%',
                store: _this.st,
                loadMask: true,
                border: 0,
                titleCollapse: true,
                collapsible: true,
                //            features: [groupingFeature],
                columns: this.columnsGrid,
                plugins: 'bufferedrenderer',
                loadMask: true,
                features: [groupingFeature, {ftype: 'summary'}],
                dockedItems: [
                    {
                        xtype: 'toolbar',
                        dock: 'bottom',
                        items: [
                            {
                                xtype: 'tbtext',
                                id: this.id + "numRowsLabel"
                            },
                            '->',
                            {
                                xtype: 'button',
                                text: 'Export',
                                handler: function () {
                                    if (!Ext.getCmp("exportWindow")) {
                                        var cbgItems = [];
                                        var attrList = _this._getColumnNames();

                                        cbgItems.push({
                                            boxLabel: attrList[0],
                                            name: 'attr',
                                            inputValue: attrList[0],
                                            checked: true,
                                            disabled: true
                                        });

                                        for (var i = 1; i < attrList.length; i++) {
                                            cbgItems.push({
                                                boxLabel: attrList[i],
                                                name: 'attr',
                                                inputValue: attrList[i],
                                                checked: true
                                            });
                                        }

                                        Ext.create('Ext.window.Window', {
                                            id: "exportWindow",
                                            title: "Export attributes",
                                            height: 250,
                                            maxHeight: 250,
                                            width: 400,
                                            autoScroll: true,
                                            layout: "vbox",
                                            modal: true,
                                            items: [
                                                {
                                                    xtype: 'checkboxgroup',
                                                    id: _this.id + "cbgAttributes",
                                                    layout: 'vbox',
                                                    items: cbgItems
                                                }
                                            ],
                                            buttons: [
                                                {
                                                    xtype: 'textfield',
                                                    id: _this.id + "fileName",
                                                    emptyText: "enter file name",
                                                    flex: 1
                                                },
                                                {
                                                    text: 'Download',
                                                    href: "none",
                                                    handler: function () {
                                                        var fileName = Ext.getCmp(_this.id + "fileName").getValue();
                                                        if (fileName == "") {
                                                            fileName = "variants";
                                                        }
                                                        var columns = Ext.getCmp(_this.id + "cbgAttributes").getChecked();

                                                        var content = _this._exportToTab(columns);

                                                        this.getEl().set({
                                                            href: 'data:text/csv,' + encodeURIComponent(content),
                                                            download: fileName + ".txt"
                                                        });
                                                    }
                                                }
                                            ]
                                        }).show();
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        );

        return grid;
    },
    _getSubColumn: function (colName) {
        var _this = this;
        var subCols = [];

        for (var i = 0; i < _this.columnsGrid.length; i++) {
            var col = _this.columnsGrid[i];

            if (col["text"] == colName && col["columns"] != null && col["columns"].length > 0) {
                var sub = col["columns"];
                for (var j = 0; j < sub.length; j++) {
                    var elem = sub[j];
                    subCols.push(elem["text"]);
                }
            }
        }
        return subCols;

    },
    _exportToTab: function (columns) {

        var _this = this;
        var colNames = [];

        var headerLine = "";
        for (var i = 0; i < columns.length; i++) {
            var col = columns[i];

            var subCols = _this._getSubColumn(col["boxLabel"]);
            if (subCols.length > 0) {
                for (var j = 0; j < subCols.length; j++) {
                    headerLine += subCols[j] + "\t";
                    colNames.push(subCols[j]);

                }
            } else {
                headerLine += col["boxLabel"] + "\t";
                colNames.push(col["boxLabel"]);
            }
            subCols.splice(0, subCols.length);

        }

        var output = "";
        output += "#" + headerLine + "\n";

        var lines = _this.st.getRange();
        for (var j = 0; j < lines.length; j++) {
            output += _this._processFileLine(lines[j].getData(), colNames);
            output += "\n";
        }

        return output;
    },
    _processFileLine: function (data, columns) {

        var line = "";
        for (var i = 0; i < columns.length; i++) {
            var col = columns[i];
            switch (col) {
                case "Variant":
                    line += data.chromosome + ":" + data.position;
                    break;
                case "Alleles":
                    line += data.ref + ">" + data.alt;
                    break;
                case "SNP id":
                    line += data.stats_id_snp;
                    break;
                case "1000G":
                    if (data.controls["1000G"]) {
                        line += data.controls["1000G"].maf + "(" + data.controls["1000G"].allele + ")";

                    } else {
                        line += ".";
                    }
                    break;
                case "BIER":
                    if (data.controls["BIER"]) {

                        line += data.controls["BIER"].maf + "(" + data.controls["BIER"].allele + ")";
                    } else {
                        line += ".";
                    }
                    break;
                case "ESP":
                    line += "-";
                    break;

                case "Gene":
                    line += data.gene_name;
                    break;
                case "Consq. Type":
                    line += data.ct;
                    break;
                case "Polyphen":
                    line += "-";
                    break;
                case "Sift":
                    line += "-";
                    break;
                case "Conservation":
                    line += "-";
                    break;

                case "Allele Ref":
                    line += data.ref;
                    break;
                case "Allele Alt":
                    line += data.alt;
                    break;

                case "MAF":
                    line += data.stats_maf;
                    break;
                case "MGF":
                    line += data.stats_mgf;
                    break;

                case "Miss. Alleles":
                    line += data.stats_miss_allele;
                    break;
                case "Miss. Genotypes":
                    line += data.stats_miss_gt;
                    break;
                case "Mendelian Errors":
                    line += data.stats_mendel_err;
                    break;
                case "Is indel?":
                    line += data.stats_is_indel;
                    break;

                case "% Controls dominant":
                    line += data.stats_cases_percent_dominant;
                    break;

                case "% Cases dominant":
                    line += data.stats_controls_percent_dominant;
                    break;
                case "% Cases recessive":
                    line += data.stats_cases_percent_recessive;
                    break;
                case "% Controls recessive":
                    line += data.stats_controls_percent_recessive;
                    break;
                default:
                    line += data[col];
            }
            line += "\t";
        }
        return line;
    },
    _getColumnNames: function () {
        var _this = this;

        var colNames = [];
        for (var i = 0; i < _this.columnsGrid.length; i++) {
            var col = _this.columnsGrid[i];
            colNames.push(col.text);
        }
        return colNames;
    },
    _prepareData: function (data) {

        var finalData = [];
        for (var i = 0; i < data.length; i++) {
            var v = data[i];

            for (var key in v.genotypes) {
                v[key] = v.genotypes[key];
            }
            delete v.genotypes;

            if (v.genes.length <= 1) {

                continue;
            } else {
                //                v.genes = v.genes.filter(function (e) {
                //                    return e
                //                });
                delete v.genes[''];
            }

            for (var key in v.genes) {
                var copy = {};
                _.extend(copy, v);

                copy.gene_name = key;
                copy.ct = v.genes[key];
                delete copy.genes;
                finalData.push(copy);


            }


        }
        return finalData;
    },
    _getResult: function () {
        var _this = this;

        // Remove all elements from gridEffect
        _this.gridEffect.getStore().removeAll();

        var values = this.form.getForm().getValues();

        console.log(values);

        var formParams = {};
        for (var param in values) {
            if (formParams[param]) {
                var aux = [];
                aux.push(formParams[param]);
                aux.push(values[param]);
                formParams[param] = aux;
            } else {
                formParams[param] = values[param];
            }
        }

        _this.grid.setLoading(true);

        OpencgaManager.variants({
            accountId: $.cookie("bioinfo_account"),
            sessionId: $.cookie("bioinfo_sid"),
            fileName: this.dbName,
            jobId: this.job.id,
            formData: formParams,
            success: function (response, textStatus, jqXHR) {
                console.log(response);
                var data = _this._prepareData(response);

                _this.st.loadData(data);

                _this.grid.getView().refresh();

                Ext.getCmp(_this.id + "numRowsLabel").setText(data.length + " variants");

                _this.grid.setLoading(false);

            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log('no va');
                _this.grid.setLoading(false);
            }
        });


    },
    _addColorPicker: function () {

        var _this = this;

        var menu = _this.grid.headerCt.getMenu();
        menu.add([
            {
                text: 'Choose color',
                menu: {
                    xtype: 'colormenu',
                    value: '000000',
                    handler: function (obj, rgb) {
                        Ext.Msg.alert('background-color: ' + rgb.toString());
                    } // handler
                } // menu
            }
        ]);

    },

////
////
    /*FORM COMPONENTS*/
////
////

    _getSelectDataPanel: function () {

        var dataBases = Ext.create('Ext.data.Store', {
            fields: ['value', 'name'],
            data: [
                {"value": "pruebas.db", "name": "pruebas"},
                {"value": "s4.db", "name": "s4"},
                {"value": "s5500.db", "name": "s5500"},
                {"value": "fpoletta.db", "name": "fpoletta"}
            ]
        });

        var data_opt = this._createComboboxDB("db_name", "Data Base", dataBases, 0, 100, '5 0 5 5');

        return Ext.create('Ext.form.Panel', {
            bodyPadding: "5",
            margin: "0 0 5 0",
            width: "100%",
            buttonAlign: 'center',
            layout: 'vbox',
            items: [data_opt]
        });
    },
    _getChrStartEnd: function () {

        var chr_pos = Ext.create('Ext.form.field.Text', {
            fieldLabel: "Chromosome",
            id: "chr_pos",
            name: "chr_pos",
            margin: '5 0 0 5',
            width: "20%",
            allowBlank: false
        });

        var start_pos = Ext.create('Ext.form.field.Text', {
            fieldLabel: 'Start',
            id: 'start_pos',
            name: 'start_pos',
            margin: '5 0 0 5',
            width: '20%',
            allowBlank: false
        });
        var end_pos = Ext.create('Ext.form.field.Text', {
            fieldLabel: 'End',
            id: "end_pos",
            name: "end_pos",
            margin: '5 0 0 5',
            width: "20%",
            allowBlank: false
        });

        return Ext.create('Ext.form.Panel', {
            //            title: 'Inheritance',
            border: true,
            bodyPadding: "5",
            margin: "0 0 5 0",
            width: "100%",
            buttonAlign: 'center',
            type: 'vbox',
            items: [chr_pos, start_pos, end_pos]
        });
    },
    _getRegionList: function () {
        var regionList = Ext.create('Ext.form.field.TextArea', {
            id: "region_list",
            name: "region_list",
            fieldLabel: 'Region list',
            margin: '0 0 0 5',
//            value: "1:1-10000000",
            allowBlank: false
        });

        return Ext.create('Ext.form.Panel', {
            border: true,
            bodyPadding: "5",
            margin: "0 0 5 0",
            width: "100%",
            buttonAlign: 'center',
            layout: 'vbox',
            items: [regionList]
        });
    },
    _getGenes: function () {
        var geneList = Ext.create('Ext.form.field.TextArea', {
            id: "genes",
            name: "genes",
            fieldLabel: 'Gene list ',
            margin: '0 0 0 5',
            allowBlank: false
        });

        return Ext.create('Ext.form.Panel', {
            border: true,
            bodyPadding: "5",
            margin: "0 0 5 0",
            width: "100%",
            buttonAlign: 'center',
            layout: 'vbox',
            items: [geneList]
        });
    },
    _getBioTypes: function () {
        return Ext.create('Ext.form.Panel', {
            border: true,
            bodyPadding: "5",
            margin: "0 0 5 0",
            width: "100%",
            buttonAlign: 'center',
            layout: 'vbox',
            id: 'biotype_panel',
            items: []
        });
    },
    _getConsequenceType: function () {

        return Ext.create('Ext.form.Panel', {
            border: true,
            bodyPadding: "5",
            margin: "0 0 5 0",
            width: "100%",
            buttonAlign: 'center',
            layout: 'vbox',
            id: "conseq_type_panel",
            items: []
        });
    },
    _getMissing: function () {
        var alleles_text = Ext.create('Ext.form.field.Text', {
            id: "miss_allele",
            name: "miss_allele",
            margin: '0 0 0 5',
            width: "20%",
            allowBlank: false
        });

        var alleles_opt = this._createCombobox("option_miss_alleles", "", this.optValues, 0, 10, '0 0 0 5');
        alleles_opt.width = "20%";

        var gt_text = Ext.create('Ext.form.field.Text', {
            id: "miss_gt",
            name: "miss_gt",
            margin: '0 0 0 5',
            allowBlank: false,
            width: "20%",
            value: 0

        });

        var gt_opt = this._createCombobox("option_miss_gt", "", this.optValues, 4, 10, '0 0 0 5');
        gt_opt.width = "20%";

        return Ext.create('Ext.form.Panel', {
            border: true,
            bodyPadding: "5",
            margin: "0 0 5 0",
            width: "100%",
            type: 'vbox',
            items: [
                {
                    xtype: 'fieldcontainer',
                    fieldLabel: 'Missing Alleles',
                    layout: 'hbox',
                    border: false,
                    items: [alleles_opt, alleles_text] },

                {
                    xtype: 'fieldcontainer',
                    fieldLabel: 'Missing Genotypes',
                    layout: 'hbox',
                    border: false,
                    items: [gt_opt, gt_text]}
            ]
        });
    },
    _getMAF: function () {
        var maf_text = Ext.create('Ext.form.field.Text', {
            id: "maf",
            name: "maf",
            margin: '0 0 0 5',
            width: "20%",
            allowBlank: false
        });

        var maf_opt = this._createCombobox("option_maf", "", this.optValues, 0, 10, '0 0 0 5');
        maf_opt.width = "20%";

        var mgf_text = Ext.create('Ext.form.field.Text', {
            id: "mgf",
            name: "mgf",
            margin: '0 0 0 5',
            allowBlank: false,
            width: "20%"
        });

        var mgf_opt = this._createCombobox("option_mgf", "", this.optValues, 0, 10, '0 0 0 5');
        mgf_opt.width = "20%";

        return Ext.create('Ext.form.Panel', {
            border: true,
            bodyPadding: "5",
            margin: "0 0 5 0",
            width: "100%",
            type: 'vbox',
            items: [
                {
                    xtype: 'fieldcontainer',
                    fieldLabel: 'MAF',
                    layout: 'hbox',
                    border: false,
                    items: [maf_opt, maf_text] },

                {
                    xtype: 'fieldcontainer',
                    fieldLabel: 'MGF',
                    layout: 'hbox',
                    border: false,
                    items: [ mgf_opt, mgf_text]}
            ]
        });
    },
    _getMendelError: function () {
        var mendel_text = Ext.create('Ext.form.field.Text', {
            id: "mend_error",
            name: "mend_error",
            margin: '0 0 0 5',
            width: "20%",
            allowBlank: false
        });

        var mendel_opt = this._createCombobox("option_mend_error", "", this.optValues, 0, 10, '0 0 0 5');
        mendel_opt.width = "20%";

        return Ext.create('Ext.form.Panel', {
            bodyPadding: "5",
            margin: "0 0 5 0",
            width: "100%",
            buttonAlign: 'center',
            type: 'vbox',
            items: [
                {
                    xtype: 'fieldcontainer',
                    fieldLabel: 'Mendel. Errors',
                    layout: 'hbox',
                    border: false,
                    items: [mendel_opt, mendel_text]
                }
            ]

        });
    },
    _getIsIndel: function () {
        return Ext.create('Ext.form.Panel', {
            bodyPadding: "5",
            margin: "0 0 5 0",
            width: "99%",
            buttonAlign: 'center',
            layout: 'vbox',
            items: [
                {
                    xtype: 'checkboxfield',
                    fieldLabel: 'Is indel?',
                    //anchor: '100%',
                    name: 'is_indel'
                    //checked: true

                }
            ]
        });
    },
    _getInheritance: function () {

        var cases_d = Ext.create('Ext.form.field.Text', {
            id: "cases_percent_dominant",
            name: "cases_percent_dominant",
            margin: '0 0 0 5',
            width: "20%",
            allowBlank: false
        });

        var cases_d_opt = this._createCombobox("option_cases_dom", "", this.optValues, 0, 10, '0 0 0 5');
        cases_d_opt.width = "20%";

        var controls_d = Ext.create('Ext.form.field.Text', {
            id: "controls_percent_dominant",
            name: "controls_percent_dominant",
            margin: '0 0 0 5',
            width: "20%",
            allowBlank: false
        });

        var controls_d_opt = this._createCombobox("option_controls_dom", "", this.optValues, 0, 10, '0 0 0 5');
        controls_d_opt.width = "20%";

        var cases_r = Ext.create('Ext.form.field.Text', {
            id: "cases_percent_recessive",
            name: "cases_percent_recessive",
            margin: '0 0 0 5',
            width: "20%",
            allowBlank: false
        });

        var cases_r_opt = this._createCombobox("option_cases_rec", "", this.optValues, 0, 10, '0 0 0 5');
        cases_r_opt.width = "20%";

        var controls_r = Ext.create('Ext.form.field.Text', {
            id: "controls_percent_recessive",
            name: "controls_percent_recessive",
            margin: '0 0 0 5',
            width: "20%",
            allowBlank: false
        });

        var controls_r_opt = this._createCombobox("option_controls_rec", "", this.optValues, 0, 10, '0 0 0 5');
        controls_r_opt.width = "20%";

        return Ext.create('Ext.form.Panel', {
            border: true,
            bodyPadding: "5",
            margin: "0 0 5 0",
            width: "100%",
            buttonAlign: 'center',
            type: 'vbox',
            items: [
                {
                    xtype: 'fieldcontainer',
                    fieldLabel: '% Cases Dominant',
                    layout: 'hbox',
                    border: false,
                    items: [cases_d_opt, cases_d]
                },
                {
                    xtype: 'fieldcontainer',
                    fieldLabel: '% Controls Dominant',
                    layout: 'hbox',
                    border: false,
                    items: [controls_d_opt, controls_d]
                },
                {
                    xtype: 'fieldcontainer',
                    fieldLabel: '% Cases recessive',
                    layout: 'hbox',
                    border: false,
                    items: [cases_r_opt, cases_r]
                },
                {
                    xtype: 'fieldcontainer',
                    fieldLabel: '% Controls recessive',
                    layout: 'hbox',
                    border: false,
                    items: [controls_r_opt, controls_r]
                }
            ]
        });


    },
    _getControls: function () {
        return Ext.create('Ext.form.Panel', {
            bodyPadding: "5",
            margin: "0 0 5 0",
            width: "100%",
            buttonAlign: 'center',
            layout: 'vbox',
            items: [
                {
                    xtype: 'fieldcontainer',
                    layout: 'hbox',
                    border: false,
                    width: "100%",
                    items: [
                        {
                            xtype: 'checkboxfield',
                            fieldLabel: 'Exclude 1000G Controls',
                            name: 'exc_1000g_controls'
                        },
                        {
                            xtype: 'textfield',
                            fieldLabel: 'or MAF',
                            name: 'maf_1000g_controls',
                            margin: '0 0 0 5',
                            labelWidth: '50%',
                            width: "50%",
                            value: '0.1'
                        }
                    ]
                },
                {
                    xtype: 'fieldcontainer',
                    //fieldLabel: '% Controls recessive',
                    layout: 'hbox',
                    border: false,
                    width: "100%",
                    items: [
                        {
                            xtype: 'checkboxfield',
                            fieldLabel: 'Exclude BIER Controls',
                            name: 'exc_bier_controls'
                        },
                        {
                            xtype: 'textfield',
                            fieldLabel: 'or MAF',
                            name: 'maf_bier_controls',
                            margin: '0 0 0 5',
                            labelWidth: '50%',
                            width: "50%"
                        }
                    ]
                }
            ]
        });
    },
    _createCombobox: function (name, label, data, defaultValue, labelWidth, margin) {
        var _this = this;

        return Ext.create('Ext.form.field.ComboBox', {
            id: name,
            name: name,
            fieldLabel: label,
            store: data,
            queryMode: 'local',
            displayField: 'name',
            valueField: 'value',
            value: data.getAt(defaultValue).get('value'),
            labelWidth: labelWidth,
            margin: margin,
            editable: false,
            allowBlank: false
        });
    },
    _createDynCombobox: function (name, label, data, defaultValue) {
        var _this = this;

        var dataAux = [];
        for (var key in data) {
            if (key != '.') {
                dataAux.push(key);
            }
        }

        return Ext.create('Ext.form.field.ComboBox', {
            name: name,
            fieldLabel: label,
            store: dataAux,
            queryMode: 'local',
            displayField: 'name',
            valueField: 'value',
            multiSelect: true,
            delimiter: ",",
            editable: false,
            allowBlank: false,
            value: defaultValue
        });
    },
    _createComboboxDB: function (name, label, data, defaultValue, labelWidth, margin) {
        var _this = this;

        return Ext.create('Ext.form.field.ComboBox', {
            id: name,
            name: name,
            fieldLabel: label,
            store: data,
            queryMode: 'local',
            displayField: 'name',
            valueField: 'value',
            value: data.getAt(defaultValue).get('value'),
            labelWidth: labelWidth,
            margin: margin,
            editable: false,
            allowBlank: false,
            listeners: {
                change: function (field, newValue, oldValue) {
                    _this._updateInfo(newValue);
                }
            }
        });
    }
};