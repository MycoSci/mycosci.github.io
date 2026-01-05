<?php
/**
 * Plugin Name: MycoSci Gene Service
 * Description: Custom post types and taxonomies for gene storage service
 * Version: 1.0.0
 * Author: MycoSci
 */

if (!defined('ABSPATH')) exit;

// Register Gene Sample CPT
add_action('init', function() {
    register_post_type('gene_sample', [
        'labels' => [
            'name' => 'Gene Samples',
            'singular_name' => 'Gene Sample',
            'add_new' => 'Add New Sample',
            'add_new_item' => 'Add New Gene Sample',
            'edit_item' => 'Edit Gene Sample',
            'view_item' => 'View Gene Sample',
            'search_items' => 'Search Gene Samples',
        ],
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_icon' => 'dashicons-database',
        'supports' => ['title', 'author', 'custom-fields'],
        'show_in_graphql' => true,
        'graphql_single_name' => 'geneSample',
        'graphql_plural_name' => 'geneSamples',
    ]);

    // Sample Status Taxonomy
    register_taxonomy('sample_status', 'gene_sample', [
        'labels' => [
            'name' => 'Sample Status',
            'singular_name' => 'Status',
        ],
        'hierarchical' => false,
        'show_ui' => true,
        'show_in_graphql' => true,
        'graphql_single_name' => 'sampleStatus',
        'graphql_plural_name' => 'sampleStatuses',
    ]);

    // Storage Type Taxonomy
    register_taxonomy('storage_type', 'gene_sample', [
        'labels' => [
            'name' => 'Storage Type',
            'singular_name' => 'Storage Type',
        ],
        'hierarchical' => true,
        'show_ui' => true,
        'show_in_graphql' => true,
        'graphql_single_name' => 'storageType',
        'graphql_plural_name' => 'storageTypes',
    ]);

    // Fungal Species Taxonomy (for linking)
    register_taxonomy('fungal_species', ['gene_sample', 'post'], [
        'labels' => [
            'name' => 'Fungal Species',
            'singular_name' => 'Fungal Species',
        ],
        'hierarchical' => true,
        'show_ui' => true,
        'show_in_graphql' => true,
        'graphql_single_name' => 'fungalSpecies',
        'graphql_plural_name' => 'fungalSpeciesTerms',
    ]);
});

// Add default taxonomy terms
add_action('init', function() {
    // Sample statuses
    $statuses = ['Received', 'Processing', 'Stored', 'Pulled', 'Expired', 'Contaminated'];
    foreach ($statuses as $status) {
        if (!term_exists($status, 'sample_status')) {
            wp_insert_term($status, 'sample_status');
        }
    }

    // Storage types
    $types = ['Cryo Vial', 'Agar Slant', 'Liquid Culture', 'Spore Syringe'];
    foreach ($types as $type) {
        if (!term_exists($type, 'storage_type')) {
            wp_insert_term($type, 'storage_type');
        }
    }
});

// Register custom fields for GraphQL
add_action('graphql_register_types', function() {
    register_graphql_field('GeneSample', 'sampleId', [
        'type' => 'String',
        'description' => 'Unique sample identifier',
        'resolve' => function($post) {
            return get_post_meta($post->ID, 'sample_id', true);
        }
    ]);

    register_graphql_field('GeneSample', 'storagePosition', [
        'type' => 'String',
        'description' => 'Storage location (Dewar-Rack-Box-Position)',
        'resolve' => function($post) {
            return get_post_meta($post->ID, 'storage_position', true);
        }
    ]);

    register_graphql_field('GeneSample', 'viabilityStatus', [
        'type' => 'String',
        'description' => 'Current viability status',
        'resolve' => function($post) {
            return get_post_meta($post->ID, 'viability_status', true);
        }
    ]);

    register_graphql_field('GeneSample', 'collectionDate', [
        'type' => 'String',
        'description' => 'Date sample was collected',
        'resolve' => function($post) {
            return get_post_meta($post->ID, 'collection_date', true);
        }
    ]);

    register_graphql_field('GeneSample', 'speciesName', [
        'type' => 'String',
        'description' => 'Species name',
        'resolve' => function($post) {
            return get_post_meta($post->ID, 'species_name', true);
        }
    ]);
});

// Auto-generate sample ID on save
add_action('save_post_gene_sample', function($post_id) {
    if (get_post_meta($post_id, 'sample_id', true)) return;

    $year = date('Y');
    $count = wp_count_posts('gene_sample')->publish + wp_count_posts('gene_sample')->draft + 1;
    $sample_id = sprintf('MYCO-%s-%05d', $year, $count);

    update_post_meta($post_id, 'sample_id', $sample_id);
});
